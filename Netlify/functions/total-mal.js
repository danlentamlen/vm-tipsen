// Hämtar totalt antal mål i VM 2026 från football-data.org
// Används av startsidans mål-tracker

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC'
const SEASON = '2026'

// In-memory cache 15 min
let cache = { data: null, timestamp: 0 }
const CACHE_TTL = 15 * 60 * 1000

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!process.env.FOOTBALL_DATA_KEY) {
    return new Response(JSON.stringify({ totalMål: 0, speladeMatcher: 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(
      `${API_BASE}/competitions/${COMPETITION_ID}/matches?season=${SEASON}&status=FINISHED`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!res.ok) {
      console.warn(`[total-mal] API svarade ${res.status}`)
      return new Response(JSON.stringify({ totalMål: 0, speladeMatcher: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const matcher = data.matches || []

    let totalMål = 0
    matcher.forEach((m) => {
      const hemma = m.score?.fullTime?.home ?? 0
      const borta = m.score?.fullTime?.away ?? 0
      totalMål += hemma + borta
    })

    const result = {
      totalMål,
      speladeMatcher: matcher.length,
      snitMålPerMatch: matcher.length > 0
        ? Math.round((totalMål / matcher.length) * 10) / 10
        : 0,
      uppdaterad: new Date().toISOString(),
    }

    cache = { data: result, timestamp: Date.now() }
    console.log(`[total-mal] ${totalMål} mål på ${matcher.length} matcher`)

    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[total-mal] FEL:', err)
    return new Response(JSON.stringify({ totalMål: 0, speladeMatcher: 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
}