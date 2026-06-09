import { getSheets, getRows } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'

function räknaPoäng(tipH, tipB, resH, resB) {
  if (tipH === resH && tipB === resB) return 5
  const tO = tipH > tipB ? 'H' : tipH === tipB ? 'X' : 'B'
  const rO = resH > resB ? 'H' : resH === resB ? 'X' : 'B'
  return tO === rO ? 2 : 0
}

/**
 * GET /.netlify/functions/scores-yesterday
 *
 * Returns top 3 performers based on match points from yesterday's matches only.
 * Questions are excluded.
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

    // Yesterday's date string (YYYY-MM-DD)
    const igår = new Date()
    igår.setDate(igår.getDate() - 1)
    const igårStr = igår.toISOString().slice(0, 10)

    // Find match_ids played yesterday
    const matcherRader = await getRows(sheets, 'Matcher!A2:H1000')
    const igårMatchIds = new Set(
      matcherRader
        .filter((r) => r[1] === igårStr)
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
