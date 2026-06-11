import { withCache } from './_cache.js'

const CACHE_TTL = 60 * 1000 // 60 seconds — matches update frequently
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
      const res = await fetch(
        `${API_BASE}/competitions/WC/matches?season=2026&status=LIVE`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
      )
      if (!res.ok) {
        const errText = await res.text()
        console.error('[live-scores] API error', res.status, errText)
        // Temporarily expose error for debugging
        return [{ _error: res.status, _msg: errText }]
      }

      const data = await res.json()
      const matches = data.matches || []

      return matches.map((m) => {
        const score = m.score?.fullTime ?? m.score?.halfTime ?? {}
        return {
          hemmalag:    norm(m.homeTeam?.name),
          bortalag:    norm(m.awayTeam?.name),
          hemma:       score.home ?? null,
          borta:       score.away ?? null,
          minut:       m.minute ?? null,
          injuryTime:  m.injuryTime ?? null,
          status:      m.status, // IN_PLAY | PAUSED
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
