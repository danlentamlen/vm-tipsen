import { getSheets, getRows } from './_sheets.js'

/**
 * GET /.netlify/functions/top-scorers
 *
 * Returns top 5 goal scorers from the "Skytteliga" sheet tab.
 *
 * Sheet columns:
 *   A = Spelare (player name)
 *   B = Land    (English country name — must match FLAGS object keys)
 *   C = Mål     (goals, integer)
 *
 * Response: Array of up to 5 objects:
 *   { spelare, land, mål }
 *
 * Returns empty array on error (graceful degradation).
 */
export default async (req) => {
  try {
    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Skytteliga!A2:C100')

    const scorers = rader
      .filter((r) => r[0] && r[2] !== '' && r[2] !== undefined)
      .map((r) => ({
        spelare: r[0].trim(),
        land: (r[1] || '').trim(),
        mål: parseInt(r[2]) || 0,
      }))
      .filter((s) => s.mål > 0)
      .sort((a, b) => b.mål - a.mål)
      .slice(0, 5)

    return new Response(JSON.stringify(scorers), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    console.error('[top-scorers] FEL:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
