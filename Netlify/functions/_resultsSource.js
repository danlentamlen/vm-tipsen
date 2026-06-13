/**
 * _resultsSource.js — Resultatkällor med normalisering, sammanslagning & fallback.
 *
 * Bakgrund: football-data.org (gratisnivån) uppdaterar resultat med fördröjning.
 * Den här modulen abstraherar bort "varifrån kommer resultatet" och slår ihop
 * flera källor så att den snabbaste vinner:
 *
 *   Primär   : football-data.org (befintlig nyckel FOOTBALL_DATA_KEY)
 *   Sekundär : TheSportsDB (gratis) — aktiveras genom att sätta env THESPORTSDB_LEAGUE
 *
 * Designprinciper:
 *   - Den sekundära källan är HELT opt-in. Är THESPORTSDB_LEAGUE inte satt görs
 *     inga anrop dit och beteendet är identiskt med tidigare → kan inte bryta
 *     den nuvarande versionen.
 *   - All matchning sker på NORMALISERADE lagnamn (norm()), samma mappning som
 *     tidigare låg dubblerad i sync-results.js och live-scores.js.
 *   - Allt är inkapslat i try/catch; en trasig källa får aldrig välta den andra.
 */

const FD_BASE = 'https://api.football-data.org/v4'
const FD_COMPETITION = 'WC'
const FD_SEASON = '2026'

const TSDB_KEY = process.env.THESPORTSDB_KEY || '3' // '3' = publik gratisnyckel
const TSDB_LEAGUE = process.env.THESPORTSDB_LEAGUE || '' // tom = sekundärkälla av
const TSDB_SEASON = process.env.THESPORTSDB_SEASON || '2026'
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json'

// BALLDONTLIE (gratis: 5 req/min) — enda gratiskällan som ger LIVE-MINUTEN via
// clock_display. HELT opt-in: utan BALLDONTLIE_KEY görs inga anrop dit, så
// beteendet är identiskt med tidigare och kan inte bryta nuvarande version.
const BDL_KEY = process.env.BALLDONTLIE_KEY || '' // tom = källan av
const BDL_SEASON = process.env.BALLDONTLIE_SEASON || '2026'
const BDL_BASE = 'https://api.balldontlie.io/fifa/worldcup/v1'

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

// ── TheSportsDB (gratis sekundärkälla) ──────────────────────────────────────
function tsdbStatus(ev) {
  const s = (ev.strStatus || '').toUpperCase()
  if (['MATCH FINISHED', 'FT', 'AET', 'PEN', 'FINISHED'].includes(s)) return 'FINISHED'
  if (['1H', '2H', 'HT', 'LIVE', 'IN PLAY', 'ET'].includes(s)) return 'IN_PLAY'
  // intHomeScore satt + inte uttryckligt live → anta avslutad
  if (ev.intHomeScore != null && ev.intAwayScore != null && s === '') return 'FINISHED'
  return 'SCHEDULED'
}

function tsdbNormalize(ev) {
  const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  return {
    hemmalag: LAGNAMN_MAP[ev.strHomeTeam] || ev.strHomeTeam || '',
    bortalag: LAGNAMN_MAP[ev.strAwayTeam] || ev.strAwayTeam || '',
    hemma:    toNum(ev.intHomeScore),
    borta:    toNum(ev.intAwayScore),
    status:   tsdbStatus(ev),
    minut:    ev.strProgress ? parseInt(ev.strProgress) || null : null,
    källa:    'thesportsdb',
  }
}

async function tsdbFetchSeason() {
  if (!TSDB_LEAGUE) return [] // sekundärkälla avstängd
  const res = await fetch(`${TSDB_BASE}/${TSDB_KEY}/eventsseason.php?id=${TSDB_LEAGUE}&s=${TSDB_SEASON}`)
  if (!res.ok) throw new Error(`thesportsdb ${res.status}`)
  const data = await res.json()
  return (data.events || []).map(tsdbNormalize)
}

// ── BALLDONTLIE (gratis, ger live-minut) ────────────────────────────────────
function bdlStatus(s) {
  const v = (s || '').toLowerCase()
  if (v === 'completed') return 'FINISHED'
  if (v === 'in_progress') return 'IN_PLAY'
  return 'SCHEDULED'
}

// clock_display → minut: "47:15" → 47, "90+02:30" → 92, null → null
function bdlMinut(clock) {
  if (!clock) return null
  const m = String(clock).match(/^(\d+)(?:\+(\d+))?/)
  if (!m) return null
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0)
}

function bdlNormalize(ev) {
  return {
    hemmalag: LAGNAMN_MAP[ev.home_team?.name] || ev.home_team?.name || '',
    bortalag: LAGNAMN_MAP[ev.away_team?.name] || ev.away_team?.name || '',
    hemma:    ev.home_score ?? null,
    borta:    ev.away_score ?? null,
    status:   bdlStatus(ev.status),
    minut:    bdlMinut(ev.clock_display),
    källa:    'balldontlie',
  }
}

// Hämtar säsongens matcher med cursor-paginering (VM = 104 matcher, sida = 100).
// Max 3 sidor som säkerhetsspärr så en trasig cursor aldrig blir oändlig loop.
async function bdlFetchSeason() {
  if (!BDL_KEY) return [] // källan avstängd
  const alla = []
  let cursor = null
  for (let i = 0; i < 3; i++) {
    const url = `${BDL_BASE}/matches?seasons[]=${BDL_SEASON}&per_page=100${cursor ? `&cursor=${cursor}` : ''}`
    const res = await fetch(url, { headers: { Authorization: BDL_KEY } })
    if (!res.ok) throw new Error(`balldontlie ${res.status}`)
    const data = await res.json()
    alla.push(...(data.data || []).map(bdlNormalize))
    cursor = data.meta?.next_cursor
    if (!cursor) break
  }
  return alla
}

// ── Sammanslagning ──────────────────────────────────────────────────────────
// Slår ihop två normaliserade listor per matchKey. För varje match väljs den
// "starkaste" posten: ett FINISHED-resultat slår IN_PLAY som slår SCHEDULED.
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
 * Sekundärkällan körs först om den hinner före football-data.
 */
export async function getFinishedResults() {
  const resultat = await Promise.allSettled([
    process.env.FOOTBALL_DATA_KEY ? fdFetch('status=FINISHED').then((d) => (d.matches || []).map(fdNormalize)) : Promise.resolve([]),
    tsdbFetchSeason(),
    bdlFetchSeason(),
  ])
  const fd   = resultat[0].status === 'fulfilled' ? resultat[0].value : []
  const tsdb = resultat[1].status === 'fulfilled' ? resultat[1].value : []
  const bdl  = resultat[2].status === 'fulfilled' ? resultat[2].value : []
  return mergeResults(fd, tsdb, bdl).filter(
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
 * Används av live-scores för startsidans "Live".
 *
 * OBS: till skillnad från mergeResults (som rankar på status) väljs här den
 * FÄRSKASTE posten per match — annars skulle en eftersläpande 0–0 från en källa
 * kunna slå en korrekt 0–1 från en annan bara för att den råkar svara först.
 */
export async function getLiveScores() {
  const today = new Date().toISOString().slice(0, 10)
  const resultat = await Promise.allSettled([
    process.env.FOOTBALL_DATA_KEY
      ? fdFetch(`dateFrom=${today}&dateTo=${today}`).then((d) => (d.matches || []).map(fdNormalize))
      : Promise.resolve([]),
    tsdbFetchSeason(),
    bdlFetchSeason(),
  ])
  const fd   = resultat[0].status === 'fulfilled' ? resultat[0].value : []
  const tsdb = resultat[1].status === 'fulfilled' ? resultat[1].value : []
  const bdl  = resultat[2].status === 'fulfilled' ? resultat[2].value : []

  const pågående = [...fd, ...tsdb, ...bdl].filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const map = new Map()
  for (const m of pågående) {
    const key = matchKey(m.hemmalag, m.bortalag)
    const befintlig = map.get(key)
    if (!befintlig || liveFräschhet(m) > liveFräschhet(befintlig)) map.set(key, m)
  }
  return [...map.values()]
}
