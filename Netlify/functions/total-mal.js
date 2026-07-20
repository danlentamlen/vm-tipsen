// Hämtar totalt antal mål i VM 2026 från football-data.org
// Används av startsidans mål-tracker OCH av betting-översikten (BetOverview)
// samt av sync-results för "mål hittills" i frågesvar-bedömningen.
//
// VIKTIGT — räknesätt (FIFA-officiellt):
//   Vi räknar ALLA riktiga mål: ordinarie tid + förlängning + straffar som lagts
//   under matchen (i spel). Vi räknar INTE straffläggning (shootout) efter oavgjort,
//   eftersom shootout-mål inte är riktiga mål enligt FIFA:s statistik.
//
//   OBS: detta skiljer sig MEDVETET från Resultat-arket/poängräkningen på match-
//   nivå (_resultsSource.js/fdNormalize), som bara sparar 90-min-resultatet. Mål-
//   räknaren är en turneringsstatistik (och facit-underlag för "antal mål"-frågan)
//   — därför ska förlängningsmål räknas med här.
//
//   football-data score-fält (bekräftat 2026-06-30):
//     score.fullTime  = KUMULATIVT (ordinarie + ET + shootout)
//     score.extraTime = enbart förlängningsmål
//     score.penalties = enbart straffläggning (shootout)
//   → riktiga mål = fullTime − penalties(shootout)

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC'
const SEASON = '2026'

// In-memory cache 15 min
let cache = { data: null, timestamp: 0 }
const CACHE_TTL = 15 * 60 * 1000

/**
 * Antal riktiga mål i en match (ordinarie + förlängning + straffar i spel),
 * exkl. straffläggning (shootout). Ren funktion → enhetstestbar utan nätverk.
 * @param {object} m - matchobjekt från football-data (/matches)
 * @returns {number}
 */
export function målIMatch(m) {
  const s = m?.score || {}
  const ft = s.fullTime || {}
  const hemma = ft.home ?? 0
  const borta = ft.away ?? 0

  // Dra bort ENDAST straffläggning. Vid PENALTY_SHOOTOUT innehåller fullTime
  // shootout-målen kumulativt → subtrahera penalties. Förlängningsmål (extraTime)
  // är riktiga mål och behålls.
  let shootoutHemma = 0
  let shootoutBorta = 0
  if (s.duration === 'PENALTY_SHOOTOUT') {
    shootoutHemma = s.penalties?.home ?? 0
    shootoutBorta = s.penalties?.away ?? 0
  }

  return (hemma - shootoutHemma) + (borta - shootoutBorta)
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

/**
 * Hämtar och räknar FIFA-mål från football-data (avslutade matcher), cache 15 min.
 * Delas av startsidans tracker, betting-översikten och sync-results så att ALLA
 * använder exakt samma siffra. Kastar vid nät-/API-fel (anropare får hantera).
 * @returns {Promise<{ totalMål:number, speladeMatcher:number, snitMålPerMatch:number, uppdaterad:string }>}
 */
export async function hämtaMålStatistik() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) return cache.data

  const res = await fetch(
    `${API_BASE}/competitions/${COMPETITION_ID}/matches?season=${SEASON}&status=FINISHED`,
    { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
  )
  if (!res.ok) throw new Error(`football-data svarade ${res.status}`)

  const data = await res.json()
  const result = { ...räknaMål(data.matches || []), uppdaterad: new Date().toISOString() }
  cache = { data: result, timestamp: Date.now() }
  return result
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

  try {
    const result = await hämtaMålStatistik()
    console.log(`[total-mal] ${result.totalMål} mål på ${result.speladeMatcher} matcher`)
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.warn('[total-mal] FEL:', err.message)
    return new Response(JSON.stringify({ totalMål: 0, speladeMatcher: 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
}
