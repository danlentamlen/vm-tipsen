import { getSheets, getRows } from './_sheets.js'

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC'
const SEASON = '2026'
const CACHE_KEY = 'scorers_cache'
const CACHE_TTL = 15 * 60 * 1000 // 15 minuter i ms

// Enkel in-memory cache för att undvika dubbla anrop
let cache = { data: null, timestamp: 0 }

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!process.env.FOOTBALL_DATA_KEY) {
    return new Response(JSON.stringify({ error: 'FOOTBALL_DATA_KEY saknas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Returnera cachad data om den är färsk
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    console.log('[scorers] Returnerar cachad data')
    return new Response(JSON.stringify(cache.data), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(
      `${API_BASE}/competitions/${COMPETITION_ID}/scorers?season=${SEASON}&limit=30`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!res.ok) {
      // Om VM inte startat än eller API-fel — returnera tom lista
      console.warn(`[scorers] API svarade ${res.status}`)
      return new Response(JSON.stringify({ scorers: [], competition: null }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()

    const scorers = (data.scorers || []).map((s, i) => ({
      plats: i + 1,
      namn: s.player?.name || '–',
      lag: s.team?.name || '–',
      mål: s.goals ?? 0,
      assists: s.assists ?? 0,
      matcher: s.playedMatches ?? 0,
    }))

    const result = {
      scorers,
      uppdaterad: new Date().toISOString(),
    }

    // Uppdatera cache
    cache = { data: result, timestamp: Date.now() }

    console.log(`[scorers] Hämtade ${scorers.length} spelare`)
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[scorers] FEL:', err)
    return new Response(JSON.stringify({ error: 'Kunde inte hämta skytteliga', scorers: [] }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}