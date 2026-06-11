import { getSheets, getMultipleRanges } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'
import { withCache } from './_cache.js'

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

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
    // Cache key includes the current date so results auto-refresh at midnight
    const dateKey = new Date().toISOString().slice(0, 10)
    const topplista = await withCache(`scores-yesterday:${dateKey}`, CACHE_TTL, async () => {
      const sheets = await getSheets()

      // One batchGet for all four ranges
      const [matcherRader, resultatRader, tipsRader, användareRader] =
        await getMultipleRanges(sheets, [
          'Matcher!A2:H1000',
          'Resultat!A2:C1000',
          'Tips!A2:E100000',
          'Användare!A2:B1000',
        ])

      // Tidsfönster: igår 16:00 CEST → idag 08:00 CEST (CEST = UTC+2)
      const now = new Date()
      const fönsterStart = new Date(now)
      fönsterStart.setUTCDate(fönsterStart.getUTCDate() - 1)
      fönsterStart.setUTCHours(14, 0, 0, 0)
      const fönsterSlut = new Date(now)
      fönsterSlut.setUTCHours(6, 0, 0, 0)

      const igårMatchIds = new Set(
        matcherRader
          .filter((r) => { const s = parseMatchStart(r[1], r[2]); return s && s >= fönsterStart && s < fönsterSlut })
          .map((r) => r[0])
          .filter(Boolean)
      )
      if (igårMatchIds.size === 0) return []

      const resultatMap = {}
      resultatRader.forEach((r) => {
        if (r[0] && igårMatchIds.has(r[0]) && r[1] !== '' && r[2] !== '') {
          resultatMap[r[0]] = { hemma: Number(r[1]), borta: Number(r[2]) }
        }
      })
      const matchesWithResults = new Set(Object.keys(resultatMap))
      if (matchesWithResults.size === 0) return []

      const poängMap = {}, exaktaMap = {}, rättaMap = {}
      tipsRader.forEach((r) => {
        const res = resultatMap[r[2]]
        if (!res || !r[1]) return
        const p = räknaPoäng(Number(r[3]), Number(r[4]), res.hemma, res.borta)
        poängMap[r[1]]  = (poängMap[r[1]]  || 0) + p
        if (p === 5) exaktaMap[r[1]] = (exaktaMap[r[1]] || 0) + 1
        if (p === 2) rättaMap[r[1]]  = (rättaMap[r[1]]  || 0) + 1
      })

      const namnMap = {}
      användareRader.forEach((r) => { if (r[0]) namnMap[r[0]] = r[1] })

      return Object.entries(poängMap)
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
    })

    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // 10 minutes
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
