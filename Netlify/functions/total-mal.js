// Hämtar totalt antal mål i VM 2026 från football-data.org
// Används av startsidans mål-tracker
//
// VIKTIGT — räknesätt (samma som poäng/betting: ENBART ordinarie tid, 90 min):
//   Vi räknar mål gjorda under ordinarie matchtid — inkl. straffar som lagts i
//   spel (de ligger i 90-min-resultatet). Vi räknar INTE förlängningsmål och
//   INTE straffläggning (shootout). Detta gör att trackern EXAKT speglar
//   Resultat-arket och poängräkningen (se _resultsSource.js / fdNormalize).
//
//   football-data score-fält (bekräftat 2026-06-30):
//     score.regularTime = officiellt 90-min-resultat (bästa källan)
//     score.fullTime    = KUMULATIVT (ordinarie + ET + shootout)
//     score.extraTime   = enbart förlängningsmål
//     score.penalties   = enbart straffläggning (shootout)
//   → 90-min-mål = regularTime om den finns, annars fullTime − ET − shootout

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC'
const SEASON = '2026'

// In-memory cache 15 min
let cache = { data: null, timestamp: 0 }
const CACHE_TTL = 15 * 60 * 1000

/**
 * Antal mål i ORDINARIE tid (90 min) i en match — inkl. straffar i spel, men
 * exkl. förlängning och straffläggning. Speglar Resultat-arket/poängräkningen.
 * Ren funktion → enhetstestbar utan nätverk.
 * @param {object} m - matchobjekt från football-data (/matches)
 * @returns {number}
 */
export function målIMatch(m) {
  const s = m?.score || {}

  // Bästa källan: officiellt 90-min-resultat.
  const rt = s.regularTime
  const rtHome = rt?.home ?? rt?.homeTeam
  const rtAway = rt?.away ?? rt?.awayTeam
  if (rtHome != null && rtAway != null) return rtHome + rtAway

  // Fallback: fullTime är kumulativt → subtrahera ET- och straffläggningsmål.
  let hemma = s.fullTime?.home ?? 0
  let borta = s.fullTime?.away ?? 0
  if (s.duration === 'EXTRA_TIME' || s.duration === 'PENALTY_SHOOTOUT') {
    hemma -= s.extraTime?.home ?? 0
    borta -= s.extraTime?.away ?? 0
  }
  if (s.duration === 'PENALTY_SHOOTOUT') {
    hemma -= s.penalties?.home ?? 0
    borta -= s.penalties?.away ?? 0
  }
  return hemma + borta
}

/**
 * Summerar mål och matcher över en lista football-data-matcher.
 * @param {object[]} matcher
 * @returns {{ totalMål: number, speladeMatcher: number, snitMålPerMatch: number }}
 */
export function räknaMål(matcher = []) {
  let totalMål = 0
  for (const m of matcher) totalMål += målIMatch(m)
  return {
    totalMål,
    speladeMatcher: matcher.length,
    snitMålPerMatch: matcher.length > 0
      ? Math.round((totalMål / matcher.length) * 10) / 10
      : 0,
  }
}

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

    const result = {
      ...räknaMål(matcher),
      uppdaterad: new Date().toISOString(),
    }

    cache = { data: result, timestamp: Date.now() }
    console.log(`[total-mal] ${result.totalMål} mål på ${result.speladeMatcher} matcher`)

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
