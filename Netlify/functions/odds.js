import { getSheets, getRows } from './_sheets.js'

/**
 * GET /.netlify/functions/odds
 *
 * Returns cached odds from the "Odds" sheet.
 * Data is written once daily at 15:00 CEST by the odds-fetch scheduled function.
 */
export default async (req) => {
  try {
    const sheets = await getSheets()
    const rader  = await getRows(sheets, 'Odds!A2:C2')

    if (!rader || rader.length === 0 || !rader[0][1]) {
      return new Response(JSON.stringify({ odds: [], uppdaterad: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const [uppdaterad, jsonData, anropKvar] = rader[0]

    let odds = []
    try {
      odds = JSON.parse(jsonData)
    } catch {
      console.error('[odds] Kunde inte parsa cachad JSON')
    }

    return new Response(JSON.stringify({ odds, uppdaterad, anropKvar }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800', // browser cache 30 min
      },
    })
  } catch (err) {
    console.error('[odds] FEL:', err)
    return new Response(JSON.stringify({ error: 'Kunde inte hämta odds', odds: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
