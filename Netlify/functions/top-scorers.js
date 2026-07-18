import { getSheets, getRows } from './_sheets.js'
import { withCache } from './_cache.js'
import { byggAssistkarta, byggWidgetSkytteliga } from './_skytteliga.js'

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes — updated manually between matches
const FD_BASE = 'https://api.football-data.org/v4'

/**
 * Hämtar assists från football-data (mål räknas fortfarande manuellt i arket).
 * Returnerar tom lista vid fel/saknad nyckel så tiebreak degraderar till mål-only
 * i stället för att krascha widgeten.
 */
async function hämtaFdScorers() {
  if (!process.env.FOOTBALL_DATA_KEY) return []
  try {
    const res = await fetch(
      `${FD_BASE}/competitions/WC/scorers?season=2026&limit=100`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } },
    )
    if (!res.ok) {
      console.warn(`[top-scorers] football-data svarade ${res.status} — kör mål-only`)
      return []
    }
    const data = await res.json()
    return data.scorers || []
  } catch (err) {
    console.warn('[top-scorers] kunde inte hämta assists:', err.message)
    return []
  }
}

export default async (req) => {
  try {
    const scorers = await withCache('top-scorers', CACHE_TTL, async () => {
      const sheets = await getSheets()
      const [rader, fdScorers] = await Promise.all([
        getRows(sheets, 'Skytteliga!A2:D100'),
        hämtaFdScorers(),
      ])
      // Mål + assists = manuella arket (kolumn C resp. D, sanningskälla).
      // football-data används bara som assist-reserv när kolumn D är tom.
      const assistKarta = byggAssistkarta(fdScorers)
      return byggWidgetSkytteliga(rader, assistKarta, 5)
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
