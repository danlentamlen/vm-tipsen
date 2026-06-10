import { getSheets, getRows } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'

function räknaPoäng(tipH, tipB, resH, resB) {
  if (tipH === resH && tipB === resB) return 5
  const tO = tipH > tipB ? 'H' : tipH === tipB ? 'X' : 'B'
  const rO = resH > resB ? 'H' : resH === resB ? 'X' : 'B'
  return tO === rO ? 2 : 0
}

/**
 * Parsar "HH:MM UTC±N" och returnerar ett UTC Date-objekt för matchens starttid.
 */
function parseMatchStart(datum, tid) {
  if (!datum || !tid) return null
  const m = tid.match(/(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i)
  if (!m) return null
  const h = parseInt(m[1]), min = parseInt(m[2]), offset = parseFloat(m[3])
  const d = new Date(`${datum}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`)
  d.setTime(d.getTime() - offset * 3600000) // konvertera till UTC
  return d
}

/**
 * GET /.netlify/functions/scores-yesterday
 *
 * Returnerar topp 3 baserat på matchpoäng för matcher som spelades
 * mellan igår 16:00 CEST och idag 08:00 CEST.
 * Tilläggsfrågor exkluderas.
 *
 * Response: Array of up to 3 objects:
 *   { user_id, namn, poäng, exakta, rätta }
 */
export default async (req) => {
  if (!gruppspelLåst()) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sheets = await getSheets()

    // Tidsfönster: igår 16:00 CEST → idag 08:00 CEST (CEST = UTC+2)
    const now = new Date()
    const fönsterStart = new Date(now)
    fönsterStart.setUTCDate(fönsterStart.getUTCDate() - 1)
    fönsterStart.setUTCHours(14, 0, 0, 0)  // igår 16:00 CEST = 14:00 UTC
    const fönsterSlut = new Date(now)
    fönsterSlut.setUTCHours(6, 0, 0, 0)    // idag 08:00 CEST = 06:00 UTC

    // Hitta match_ids vars CEST-starttid ligger i fönstret
    const matcherRader = await getRows(sheets, 'Matcher!A2:H1000')
    const igårMatchIds = new Set(
      matcherRader
        .filter((r) => {
          const start = parseMatchStart(r[1], r[2])
          return start && start >= fönsterStart && start < fönsterSlut
        })
        .map((r) => r[0])
        .filter(Boolean)
    )

    if (igårMatchIds.size === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get results for yesterday's matches
    const resultatRader = await getRows(sheets, 'Resultat!A2:C1000')
    const resultatMap = {}
    resultatRader.forEach((r) => {
      if (r[0] && igårMatchIds.has(r[0]) && r[1] !== '' && r[2] !== '') {
        resultatMap[r[0]] = { hemma: Number(r[1]), borta: Number(r[2]) }
      }
    })

    // Only count matches that actually have results
    const matchesWithResults = new Set(Object.keys(resultatMap))
    if (matchesWithResults.size === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Calculate match points per user for yesterday only
    const tipsRader = await getRows(sheets, 'Tips!A2:E100000')
    const poängMap = {}
    const exaktaMap = {}
    const rättaMap = {}

    tipsRader.forEach((r) => {
      const match_id = r[2]
      if (!matchesWithResults.has(match_id)) return
      const res = resultatMap[match_id]
      if (!res) return

      const user_id = r[1]
      if (!user_id) return

      const p = räknaPoäng(Number(r[3]), Number(r[4]), res.hemma, res.borta)
      poängMap[user_id]  = (poängMap[user_id]  || 0) + p
      if (p === 5) exaktaMap[user_id] = (exaktaMap[user_id] || 0) + 1
      if (p === 2) rättaMap[user_id]  = (rättaMap[user_id]  || 0) + 1
    })

    // Get user names
    const användareRader = await getRows(sheets, 'Användare!A2:B1000')
    const namnMap = {}
    användareRader.forEach((r) => { if (r[0]) namnMap[r[0]] = r[1] })

    // Build top 3
    const topplista = Object.entries(poängMap)
      .filter(([, p]) => p > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([user_id, poäng]) => ({
        user_id,
        namn:   namnMap[user_id] || 'Okänd',
        poäng,
        exakta: exaktaMap[user_id] || 0,
        rätta:  rättaMap[user_id]  || 0,
      }))

    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    console.error('[scores-yesterday] FEL:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
