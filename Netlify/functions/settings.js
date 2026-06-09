import { getSheets, getRows } from './_sheets.js'
import { gruppspelLåst, byggLåsMap, getSettings } from './_settings.js'

export default async (req) => {
  try {
    const sheets = await getSheets()

    const [matcherRader, inställningar] = await Promise.all([
      getRows(sheets, 'Matcher!A2:H1000'),
      getSettings().catch(() => ({})),
    ])

    const allaMatcher = matcherRader.map((rad) => ({
      match_id: rad[0],
      datum:    rad[1],
      tid:      rad[2],
      hemmalag: rad[3],
      bortalag: rad[4],
      grupp:    rad[5],
      omgång:   rad[6],
      arena:    rad[7],
    }))

    const låst = gruppspelLåst()

    // Bygg map: match_id -> låst (true/false)
    const matchLås = byggLåsMap(allaMatcher)

    return new Response(
      JSON.stringify({
        tips_låst:    låst ? 'true' : 'false', // sträng för bakåtkompatibilitet med Admin.jsx
        frågor_låsta: låst,                    // boolean
        match_lås:    matchLås,                // { match_001: true, match_002: false, ... }
        swish_nummer: inställningar.swish_nummer || '',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[settings]', err)
    return new Response(JSON.stringify({ error: 'Kunde inte hämta inställningar' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
