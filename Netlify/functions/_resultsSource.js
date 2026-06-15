/**
 * _resultsSource.js — Resultatkällor med normalisering, sammanslagning & fallback.
 *
 * Källor:
 *   Primär (slutresultat) : football-data.org — FOOTBALL_DATA_KEY
 *   Live + snabba resultat: TheSportsDB Premium V2 — THESPORTSDB_KEY + THESPORTSDB_LEAGUE
 *   Säsongsresultat (V1)  : TheSportsDB Premium V1 — för getFinishedResults
 *
 * Designprinciper:
 *   - TheSportsDB är opt-in: utan THESPORTSDB_LEAGUE görs inga anrop dit.
 *   - All matchning sker på normaliserade lagnamn (norm()).
 *   - Allt är inkapslat i try/catch; en trasig källa välter aldrig den andra.
 */
import { parseMatchStart } from './_scoring.js'
import { getCached } from './_persistentCache.js'

const FD_BASE = 'https://api.football-data.org/v4'
const FD_COMPETITION = 'WC'
const FD_SEASON = '2026'

const TSDB_KEY    = process.env.THESPORTSDB_KEY    || ''
const TSDB_LEAGUE = process.env.THESPORTSDB_LEAGUE || '' // tom = källan av
// V1 vill ha bara startåret ("2026"), V2 vill ha "2026-2027".
// THESPORTSDB_SEASON sätts till "2026-2027" i Netlify — strippa till år för V1.
const TSDB_SEASON_FULL = process.env.THESPORTSDB_SEASON || '2026-2027'
const TSDB_SEASON_V1   = TSDB_SEASON_FULL.split('-')[0]  // "2026"
const TSDB_V1_BASE = 'https://www.thesportsdb.com/api/v1/json'
const TSDB_V2_BASE = 'https://www.thesportsdb.com/api/v2/json'

// ── Lagnamn-mappning → vårt format ──────────────────────────────────────────
export const LAGNAMN_MAP = {
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
  'Cabo Verde':             'Cape Verde',
}

/** Normaliserar ett lagnamn till gemener för robust matchning. */
export function norm(name) {
  return (LAGNAMN_MAP[name] || name || '').trim().toLowerCase()
}

/** Nyckel för en match oberoende av källa. */
export function matchKey(hemma, borta) {
  return `${norm(hemma)}_${norm(borta)}`
}

// ── Football-data.org ───────────────────────────────────────────────────────
async function fdFetch(query) {
  const res = await fetch(`${FD_BASE}/competitions/${FD_COMPETITION}/matches?season=${FD_SEASON}&${query}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY },
  })
  if (!res.ok) throw new Error(`football-data ${res.status}`)
  return res.json()
}

function fdNormalize(m) {
  const score = m.score?.fullTime ?? m.score?.halfTime ?? {}
  return {
    hemmalag: LAGNAMN_MAP[m.homeTeam?.name] || m.homeTeam?.name || '',
    bortalag: LAGNAMN_MAP[m.awayTeam?.name] || m.awayTeam?.name || '',
    hemma:    score.home ?? null,
    borta:    score.away ?? null,
    status:   m.status,                 // FINISHED | IN_PLAY | PAUSED | TIMED | SCHEDULED
    minut:    m.minute ?? null,
    källa:    'football-data',
  }
}

// ── TheSportsDB V1 (säsong, slutresultat) ───────────────────────────────────
function tsdbV1Status(ev) {
  const s = (ev.strStatus || '').toUpperCase()
  if (['MATCH FINISHED', 'FT', 'AET', 'PEN', 'FINISHED'].includes(s)) return 'FINISHED'
  if (['1H', '2H', 'HT', 'LIVE', 'IN PLAY', 'ET'].includes(s)) return 'IN_PLAY'
  if (ev.intHomeScore != null && ev.intAwayScore != null && s === '') return 'FINISHED'
  return 'SCHEDULED'
}

function tsdbV1Normalize(ev) {
  const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  return {
    hemmalag: LAGNAMN_MAP[ev.strHomeTeam] || ev.strHomeTeam || '',
    bortalag: LAGNAMN_MAP[ev.strAwayTeam] || ev.strAwayTeam || '',
    hemma:    toNum(ev.intHomeScore),
    borta:    toNum(ev.intAwayScore),
    status:   tsdbV1Status(ev),
    minut:    ev.strProgress ? parseInt(ev.strProgress) || null : null,
    källa:    'thesportsdb-v1',
  }
}

async function tsdbFetchSeason() {
  if (!TSDB_LEAGUE || !TSDB_KEY) return []
  const res = await fetch(`${TSDB_V1_BASE}/${TSDB_KEY}/eventsseason.php?id=${TSDB_LEAGUE}&s=${TSDB_SEASON_V1}`)
  if (!res.ok) throw new Error(`thesportsdb-v1 ${res.status}`)
  const data = await res.json()
  return (data.events || []).map(tsdbV1Normalize)
}

// ── TheSportsDB V2 (Premium livescores, ~2 min fördröjning) ─────────────────
// Endpoint: /livescore/soccer eller /livescore/{leagueId}
// Auth: X-API-KEY header (Premium-nyckel krävs)
// Fält: strHomeTeam, strAwayTeam, intHomeScore, intAwayScore,
//       strStatus (1H/HT/2H/FT/...), strProgress ("45+5", "67", ...)
function tsdbV2Status(ev) {
  const s = (ev.strStatus || '').toUpperCase()
  if (['FT', 'AET', 'PEN', 'MATCH FINISHED', 'FINISHED'].includes(s)) return 'FINISHED'
  if (['1H', '2H', 'HT', 'LIVE', 'IN PLAY', 'ET', 'EXTRA TIME'].includes(s)) return 'IN_PLAY'
  if (ev.intHomeScore != null && ev.intAwayScore != null) return 'FINISHED'
  return 'SCHEDULED'
}

// "45+5" → 50, "67" → 67, "HT" → 45, null → null
function tsdbV2Minut(progress, status) {
  if (!progress && (status || '').toUpperCase() === 'HT') return 45
  if (!progress) return null
  const m = String(progress).match(/^(\d+)(?:\+(\d+))?/)
  if (!m) return null
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0)
}

function tsdbV2Normalize(ev) {
  const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  const status = tsdbV2Status(ev)
  return {
    hemmalag: LAGNAMN_MAP[ev.strHomeTeam] || ev.strHomeTeam || '',
    bortalag: LAGNAMN_MAP[ev.strAwayTeam] || ev.strAwayTeam || '',
    hemma:    toNum(ev.intHomeScore),
    borta:    toNum(ev.intAwayScore),
    status,
    minut:    tsdbV2Minut(ev.strProgress, ev.strStatus),
    källa:    'thesportsdb-v2',
  }
}

async function tsdbV2LiveFetch() {
  if (!TSDB_LEAGUE || !TSDB_KEY) return []
  // Hämta livescores för specifik liga (snabbare än alla sporter)
  const url = `${TSDB_V2_BASE}/livescore/${TSDB_LEAGUE}`
  const res = await fetch(url, {
    headers: { 'X-API-KEY': TSDB_KEY },
  })
  if (!res.ok) throw new Error(`thesportsdb-v2 ${res.status}`)
  const data = await res.json()
  // API returnerar { livescore: [...] } eller { events: [...] }
  const events = data.livescore || data.events || []
  return events.map(tsdbV2Normalize)
}

// ── Sammanslagning ──────────────────────────────────────────────────────────
// Slår ihop normaliserade listor per matchKey. För varje match väljs den
// "starkaste" posten: FINISHED slår IN_PLAY som slår SCHEDULED.
const STATUS_RANK = { FINISHED: 3, IN_PLAY: 2, PAUSED: 2, SCHEDULED: 1, TIMED: 1 }

export function mergeResults(...listor) {
  const map = new Map()
  for (const lista of listor) {
    for (const m of lista || []) {
      if (!m.hemmalag || !m.bortalag) continue
      const key = matchKey(m.hemmalag, m.bortalag)
      const befintlig = map.get(key)
      if (!befintlig || (STATUS_RANK[m.status] || 0) > (STATUS_RANK[befintlig.status] || 0)) {
        map.set(key, m)
      }
    }
  }
  return [...map.values()]
}

/**
 * Mappar AVSLUTADE (FINISHED) resultat → våra match_id via Matcher-arket.
 *
 * Matchningen sker på normaliserade lagnamn. Två fallnivåer:
 *   1. Exakt ordning  (källans hemma/borta = arkets team1/team2)
 *   2. Omvänd ordning (källan listar lagen tvärtom) → DÅ byts även målen så att
 *      de hamnar i rätt kolumn (annars sparas fel ställning).
 *
 * Resultat som inte kan matchas returneras i `omatchade` i stället för att tyst
 * försvinna. Det inträffar t.ex. när Matcher-arket fortfarande har openfootballs
 * platshållarnamn ("UEFA Path A winner", "IC Path 1 winner") för lag som hunnit
 * kvalificera sig — då returnerar football-data det riktiga lagnamnet och nyckeln
 * matchar aldrig. Anroparen kan logga `omatchade` så felet syns.
 *
 * @param {Array}   avslutade     normaliserade FINISHED-resultat: { hemmalag, bortalag, hemma, borta }
 * @param {Array[]} matcherRader  Matcher-arket: A=match_id, B=datum, C=tid, D=team1, E=team2
 * @returns {{ rader: Array[], omatchade: Array }} rader = [[match_id, hemma, borta]]
 */
export function mappaAvslutadeTillMatchId(avslutade = [], matcherRader = []) {
  const lookup = new Map()
  for (const rad of matcherRader || []) {
    if (rad && rad[0] && rad[3] && rad[4]) lookup.set(matchKey(rad[3], rad[4]), rad[0])
  }

  const rader = []
  const omatchade = []
  for (const m of avslutade || []) {
    if (!m || !m.hemmalag || !m.bortalag || m.hemma == null || m.borta == null) continue

    const direkt = lookup.get(matchKey(m.hemmalag, m.bortalag))
    if (direkt) { rader.push([direkt, String(m.hemma), String(m.borta)]); continue }

    // Omvänd ordning → byt målen så de matchar arkets hemma/borta-kolumner
    const omvänd = lookup.get(matchKey(m.bortalag, m.hemmalag))
    if (omvänd) { rader.push([omvänd, String(m.borta), String(m.hemma)]); continue }

    omatchade.push(m)
  }
  return { rader, omatchade }
}

/**
 * Avslutade matcher (FINISHED) från alla tillgängliga källor, sammanslagna.
 * football-data.org (primär) + TheSportsDB V1 (sekundär).
 */
export async function getFinishedResults() {
  const resultat = await Promise.allSettled([
    process.env.FOOTBALL_DATA_KEY ? fdFetch('status=FINISHED').then((d) => (d.matches || []).map(fdNormalize)) : Promise.resolve([]),
    tsdbFetchSeason(),
  ])
  const fd   = resultat[0].status === 'fulfilled' ? resultat[0].value : []
  const tsdb = resultat[1].status === 'fulfilled' ? resultat[1].value : []
  return mergeResults(fd, tsdb).filter(
    (m) => m.status === 'FINISHED' && m.hemma != null && m.borta != null,
  )
}

/**
 * Topp-N målskyttar (skytteligan) från football-data.org, normaliserade till
 * Skytteliga-arkets format: { spelare, land, mål }.
 *
 * Returnerar [] om FOOTBALL_DATA_KEY saknas eller API svarar fel (t.ex. innan VM
 * startat) — kastar bara vid nätverksfel, så att anroparen kan välja att behålla
 * befintlig data i stället för att skriva över med tomt.
 */
export async function getTopScorers(antal = 15) {
  if (!process.env.FOOTBALL_DATA_KEY) return []
  const res = await fetch(
    `${FD_BASE}/competitions/${FD_COMPETITION}/scorers?season=${FD_SEASON}&limit=${antal}`,
    { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } },
  )
  if (!res.ok) {
    console.warn(`[resultsSource] scorers ${res.status}`)
    return []
  }
  const data = await res.json()
  return (data.scorers || [])
    .map((s) => ({
      spelare: s.player?.name || '',
      land:    LAGNAMN_MAP[s.team?.name] || s.team?.name || '',
      mål:     s.goals ?? 0,
    }))
    .filter((s) => s.spelare && s.mål > 0)
}

/**
 * Färskhetsmått för en pågående match. Mål kan bara öka under en match, så flest
 * mål = senaste ställningen; minuten är tiebreak. Används för att välja rätt post
 * när flera källor rapporterar samma live-match.
 */
function liveFräschhet(m) {
  const mål = (Number(m.hemma) || 0) + (Number(m.borta) || 0)
  const minut = Number(m.minut) || 0
  return mål * 1000 + minut
}

/**
 * Pågående matcher (IN_PLAY/PAUSED) från alla källor, sammanslagna.
 * Primär live-källa: TheSportsDB V2 (Premium, ~2 min fördröjning, ger minut).
 * Fallback: football-data.org (dagsresultat).
 */
export async function getLiveScores() {
  const today = new Date().toISOString().slice(0, 10)
  const resultat = await Promise.allSettled([
    process.env.FOOTBALL_DATA_KEY
      ? fdFetch(`dateFrom=${today}&dateTo=${today}`).then((d) => (d.matches || []).map(fdNormalize))
      : Promise.resolve([]),
    tsdbV2LiveFetch(),
  ])
  const fd   = resultat[0].status === 'fulfilled' ? resultat[0].value : []
  const tsdb = resultat[1].status === 'fulfilled' ? resultat[1].value : []

  return väljLive([...fd, ...tsdb])
}

/**
 * Väljer pågående matcher ur en sammanslagen lista från alla källor.
 *
 * En match räknas som AVSLUTAD så fort NÅGON källa säger FINISHED — då får den
 * aldrig visas som live, även om en långsammare källa (t.ex. football-datas
 * gratisnivå) fortfarande släpar efter och rapporterar IN_PLAY.
 *
 * Bland kvarvarande IN_PLAY/PAUSED väljs den FÄRSKASTE posten per match
 * (flest mål, sedan minut som tiebreak).
 */
export function väljLive(alla = []) {
  const avslutadeNycklar = new Set(
    alla.filter((m) => m.status === 'FINISHED').map((m) => matchKey(m.hemmalag, m.bortalag)),
  )
  const pågående = alla.filter(
    (m) => (m.status === 'IN_PLAY' || m.status === 'PAUSED') &&
           !avslutadeNycklar.has(matchKey(m.hemmalag, m.bortalag)),
  )
  const map = new Map()
  for (const m of pågående) {
    const key = matchKey(m.hemmalag, m.bortalag)
    const befintlig = map.get(key)
    if (!befintlig || liveFräschhet(m) > liveFräschhet(befintlig)) map.set(key, m)
  }
  return [...map.values()]
}

/**
 * Tidsspärr för "Pågår nu": en match kan inte rimligen vara live längre än
 * `maxTimmar` efter avspark (90 min + paus + tillägg + ev. förlängning/straffar
 * ryms väl inom ~3,5 h). Skyddar mot "zombie-live" när ALLA källor släpar och
 * fortsätter rapportera IN_PLAY långt efter slutsignal.
 *
 * Matchar live-poster mot Matcher-arkets avsparkstid via normaliserade lagnamn.
 * Poster vars avspark är okänd behålls (bryter inte nuvarande beteende).
 *
 * @param {Array}   live          live-poster: { hemmalag, bortalag, ... }
 * @param {Array[]} matcherRader  Matcher-arket: A=match_id, B=datum, C=tid, D=team1, E=team2
 * @param {Date}    now
 * @param {number}  maxTimmar
 */
export function filtreraEjLive(live = [], matcherRader = [], now = new Date(), maxTimmar = 3.5) {
  const kickoff = new Map()
  for (const rad of matcherRader || []) {
    if (rad && rad[3] && rad[4]) {
      const start = parseMatchStart(rad[1], rad[2])
      if (start) kickoff.set(matchKey(rad[3], rad[4]), start)
    }
  }
  const gräns = maxTimmar * 3600000
  return live.filter((m) => {
    const start = kickoff.get(matchKey(m.hemmalag, m.bortalag))
    if (!start) return true // okänd avspark → behåll
    return now.getTime() - start.getTime() < gräns
  })
}

/**
 * NYSS avslutade matcher (FINISHED) — de vars avspark ligger inom de senaste
 * `fönsterTimmar`. Används för att visa slutställningen på matchkortet DIREKT
 * från live-källan, utan att vänta på att sync-results skriver till arket (som
 * kan dröja p.g.a. skrivpaus + 5-minutersschema). Äldre matcher faller bort →
 * de hämtas ändå korrekt från arket via match-stats.
 *
 * @param {Array}   finished      FINISHED-poster: { hemmalag, bortalag, hemma, borta, ... }
 * @param {Array[]} matcherRader  Matcher-arket: A=match_id, B=datum, C=tid, D=team1, E=team2
 * @param {Date}    now
 * @param {number}  fönsterTimmar hur länge en avslutad match räknas som "nyss"
 */
export function nyligenAvslutade(finished = [], matcherRader = [], now = new Date(), fönsterTimmar = 5) {
  const kickoff = new Map()
  for (const rad of matcherRader || []) {
    if (rad && rad[3] && rad[4]) {
      const start = parseMatchStart(rad[1], rad[2])
      if (start) kickoff.set(matchKey(rad[3], rad[4]), start)
    }
  }
  const gräns = fönsterTimmar * 3600000
  return finished.filter((m) => {
    if (m.hemma == null || m.borta == null) return false
    const start = kickoff.get(matchKey(m.hemmalag, m.bortalag))
    if (!start) return false // okänd avspark → låt arket sköta den
    return now.getTime() - start.getTime() < gräns
  })
}
