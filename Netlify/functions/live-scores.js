import { withCache } from './_cache.js'

const CACHE_TTL = 60 * 1000 // 60 seconds
const API_BASE  = 'https://api.football-data.org/v4'

// Lagnamn-mapping: football-data.org → vårt format
const LAGNAMN_MAP = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':     'Bosnia & Herzegovina',
  'United States':          'USA',
  'Korea Republic':         'South Korea',
  'Korea DPR':              'North Korea',
  'IR Iran':                'Iran',
  'Czechia':                'Czech Republic',
  'Türkiye':                'Turkey',
  "Côte d'Ivoire":          'Ivory Coast',
  'China PR':               'China',
}

function norm(name) {
  return (LAGNAMN_MAP[name] || name || '').trim()
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!process.env.FOOTBALL_DATA_KEY) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const live = await withCache('live-scores', CACHE_TTL, async () => {
      // Fetch today's WC matches by date — status=LIVE filter is unreliable
      // on the current subscription tier, so we fetch all of today's matches
      // and filter locally for IN_PLAY / PAUSED.
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetch(
        `${API_BASE}/competitions/WC/matches?season=2026&dateFrom=${today}&dateTo=${today}`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
      )

      if (!res.ok) {
        console.error('[live-scores] API error', res.status)
        return []
      }

      const data = await res.json()
      // DEBUG: return all matches with their statuses so we can see what the API returns
      if (!data.matches?.length) return [{ _debug: 'no matches', count: 0, resultCount: data.resultSet?.count }]
      const allStatuses = data.matches.map(m => ({ home: m.homeTeam?.name, away: m.awayTeam?.name, status: m.status, utcDate: m.utcDate }))
      const matches = (data.matches || []).filter(
        (m) => m.status === 'IN_PLAY' || m.status === 'PAUSED'
      )
      if (!matches.length) return [{ _debug: 'no live matches', allMatches: allStatuses }]

      return matches.map((m) => {
        // During a live match fullTime is updated in real-time
        const score = m.score?.fullTime ?? m.score?.halfTime ?? {}
        return {
          hemmalag:   norm(m.homeTeam?.name),
          bortalag:   norm(m.awayTeam?.name),
          hemma:      score.home ?? null,
          borta:      score.away ?? null,
          minut:      m.minute ?? null,
          injuryTime: m.injuryTime ?? null,
          status:     m.status,
        }
      })
    })

    return new Response(JSON.stringify(live), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    console.error('[live-scores] FEL:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
