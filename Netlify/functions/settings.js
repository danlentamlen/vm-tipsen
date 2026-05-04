import { getSheets, getRows } from './_sheets.js'
import { getSettings, byggLåsMap } from './_settings.js'

export default async (req) => {
  try {
    const sheets = await getSheets()

    const [settings, matcherRader] = await Promise.all([
      getSettings(),
      getRows(sheets, 'Matcher!A2:H1000'),
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

    // Bygg map: match_id -> låst (true/false)
    const matchLås = byggLåsMap(allaMatcher, settings)

    // Tilläggsfrågor låses globalt: tips_låst-flagga ELLER 11 juni
    const nu = new Date()
    const frågaDeadline = new Date('2026-06-11T00:00:00+02:00')
    const frågorLåsta = settings.tips_låst === 'true' || nu >= frågaDeadline

    return new Response(
      JSON.stringify({
        ...settings,
        match_lås:    matchLås,    // { match_001: true, match_002: false, ... }
        frågor_låsta: frågorLåsta, // boolean
        // tips_låst behålls för bakåtkompatibilitet med Admin.jsx
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