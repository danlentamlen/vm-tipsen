import { getSheets, getRows } from './_sheets.js'
import { withCache } from './_cache.js'

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes — updated manually between matches

export default async (req) => {
  try {
    const scorers = await withCache('top-scorers', CACHE_TTL, async () => {
      const sheets = await getSheets()
      const rader = await getRows(sheets, 'Skytteliga!A2:C100')
      return rader
        .filter((r) => r[0] && r[2] !== '' && r[2] !== undefined)
        .map((r) => ({
          spelare: r[0].trim(),
          land:    (r[1] || '').trim(),
          mål:     parseInt(r[2]) || 0,
        }))
        .filter((s) => s.mål > 0)
        .sort((a, b) => b.mål - a.mål)
        .slice(0, 5)
    })

    return new Response(JSON.stringify(scorers), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // 10 minutes
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
