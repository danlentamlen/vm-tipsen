import { getSheets, getRows } from './_sheets.js'
import { withCache } from './_cache.js'

// Tournament schedule is static — cache for 4 hours
const CACHE_TTL = 4 * 60 * 60 * 1000

export default async (req) => {
  try {
    const matcher = await withCache('matches', CACHE_TTL, async () => {
      const sheets = await getSheets()
      const rader = await getRows(sheets, 'Matcher!A2:H1000')
      return rader.map((rad) => ({
        match_id: rad[0],
        datum:    rad[1],
        tid:      rad[2],
        hemmalag: rad[3],
        bortalag: rad[4],
        grupp:    rad[5],
        omgång:   rad[6],
        arena:    rad[7],
      }))
    })

    return new Response(JSON.stringify(matcher), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=14400', // 4 hours
      },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}