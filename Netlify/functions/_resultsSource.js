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
  'Cape Verde Islands':     'Cape Verde',
  'Congo DR':               'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
}

// ── FIFA-rankning (juni 2026, uppdaterades 2026-06-11) ───────────────────────
// Används som sista tiebreaker bland tabelltreor (efter P, GD, GF, conduct score).
// Lägre värde = bättre rankning.
// Källa: https://www.espn.com/soccer/story/_/id/46664763/fifa-mens-top-50-world-rankings
const FIFA_RANKNING_2026 = {
  'Argentina': 1, 'Spain': 2, 'France': 3, 'England': 4, 'Portugal': 5,
  'Brazil': 6, 'Morocco': 7, 'Netherlands': 8, 'Belgium': 9, 'Germany': 10,
  'Croatia': 11, 'Italy': 12, 'Colombia': 13, 'Mexico': 14, 'Senegal': 15,
  'Uruguay': 16, 'USA': 17, 'Japan': 18, 'Switzerland': 19, 'Iran': 20,
  'Denmark': 21, 'Turkey': 22, 'Ecuador': 23, 'Austria': 24, 'South Korea': 25,
  'Nigeria': 26, 'Australia': 27, 'Algeria': 28, 'Egypt': 29, 'Canada': 30,
  'Norway': 31, 'Ukraine': 32, 'Ivory Coast': 33, 'Panama': 34,
  'Poland': 36, 'Wales': 37, 'Sweden': 38, 'Hungary': 39, 'Czech Republic': 40,
  'Paraguay': 41, 'Scotland': 42, 'Serbia': 43, 'Cameroon': 44, 'Tunisia': 45,
  'DR Congo': 46, 'Slovakia': 47, 'Greece': 48, 'Venezuela': 49, 'Uzbekistan': 50,
  'Qatar': 56, 'Iraq': 57, 'South Africa': 60, 'Saudi Arabia': 61,
  'Jordan': 63, 'Bosnia & Herzegovina': 64, 'Cape Verde': 67, 'Ghana': 73,
  'Curaçao': 82, 'Haiti': 83, 'New Zealand': 85,
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

// Tävlingen räknar ENBART ordinarie tid (90 min). En match kan ha upp till tre
// delar: ordinarie tid, förlängning och straffar — men bara ordinarie tid ger
// poäng (både på resultat- och antal mål-delen).
//
// football-data.org v4 (se docs.football-data.org/general/v4/overtime.html):
//   score.fullTime    = LÖPANDE/slutresultat, KUMULATIVT (inkl. ET- och straffmål)
//   score.regularTime = mål efter 90 min  ← exakt det tävlingen vill ha
//   score.extraTime   = enbart mål gjorda under förlängningen
//   score.penalties   = enbart straffmål
//
// Primärt använder vi score.regularTime rakt av. Om fältet saknas (äldre/ofull-
// ständig feed) faller vi tillbaka på att subtrahera ET- och straffmål från
// fullTime — vilket per dokumentationen ger samma 90-min-resultat.
//
// Bekräftat med rå API-data (2026-06-30):
//   Germany-Paraguay 1-1 FT → straffar 3-4 → FD rapporterar fullTime={4,5}
//   Netherlands-Morocco 1-1 FT → straffar 2-3 → FD rapporterar fullTime={3,4}
export function fdNormalize(m) {
  const duration = m.score?.duration   // 'REGULAR'/'REGULAR_TIME' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
  const ft   = m.score?.fullTime    ?? m.score?.halfTime ?? {}
  const rt   = m.score?.regularTime ?? {}
  const et   = m.score?.extraTime   ?? {}
  const pens = m.score?.penalties   ?? {}

  // Vissa svar använder home/away, dokumentationens exempel homeTeam/awayTeam.
  const rtHome = rt.home ?? rt.homeTeam ?? null
  const rtAway = rt.away ?? rt.awayTeam ?? null

  let hemma, borta

  if (rtHome != null && rtAway != null) {
    // Bästa källan: officiellt 90-min-resultat.
    hemma = rtHome
    borta = rtAway
  } else {
    // Fallback: rekonstruera 90-min-resultatet ur det kumulativa fullTime.
    hemma = ft.home ?? null
    borta = ft.away ?? null
    if (hemma != null && borta != null) {
      if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
        hemma -= et.home ?? 0
        borta -= et.away ?? 0
      }
      if (duration === 'PENALTY_SHOOTOUT') {
        hemma -= pens.home ?? 0
        borta -= pens.away ?? 0
      }
    }
  }

  // score.winner sätts av FD för knockout-matcher → vinnare för bracket-propagering
  const fdWinner = m.score?.winner
  const vinnare = fdWinner === 'HOME_TEAM' ? 'H' : fdWinner === 'AWAY_TEAM' ? 'A' : null
  return {
    hemmalag: LAGNAMN_MAP[m.homeTeam?.name] || m.homeTeam?.name || '',
    bortalag: LAGNAMN_MAP[m.awayTeam?.name] || m.awayTeam?.name || '',
    hemma, borta,
    vinnare,                            // 'H' | 'A' | null (null = gruppspel/okänt)
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

export function tsdbV1Normalize(ev) {
  const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  const s = (ev.strStatus || '').toUpperCase()
  const status = tsdbV1Status(ev)

  // TheSportsDB returnerar ett kumulativt slutresultat i intHomeScore/intAwayScore:
  //   FT-match  : 90-min-mål
  //   AET-match : 90-min-mål + förlängningsmål
  //   PEN-match : 90-min-mål + förlängningsmål + straffmål (!)
  //
  // intHomeExtraTime  = enbart mål gjorda under förlängningstid
  // intHomePenaltyScore = enbart straffmål (ej kumulativa med fältmål)
  //
  // För att få 90-min-resultatet subtraherar vi både ET-mål och straffmål.
  let hemma = toNum(ev.intHomeScore)
  let borta = toNum(ev.intAwayScore)
  const penH = toNum(ev.intHomeScoresPenaltyScore) ?? toNum(ev.intHomePenaltyScore) ?? null
  const penB = toNum(ev.intAwayScoresPenaltyScore) ?? toNum(ev.intAwayPenaltyScore) ?? null
  if (['AET', 'PEN'].includes(s) && hemma != null && borta != null) {
    const etH = toNum(ev.intHomeExtraTime) ?? 0
    const etB = toNum(ev.intAwayExtraTime) ?? 0
    hemma -= etH
    borta -= etB
    if (s === 'PEN' && penH != null && penB != null) {
      hemma -= penH
      borta -= penB
    }
  }

  // Vinnare för bracket-propagering i knockout-matcher
  let vinnare = ''
  if (['AET', 'PEN'].includes(s)) {
    if (penH != null && penB != null) {
      // Straffar avgör: enkel jämförelse av straffmål
      vinnare = penH > penB ? 'H' : penH < penB ? 'A' : ''
    } else {
      // AET avgjord utan straffar — vinnaren avgörs av TOTALRESULTATET (inkl. ET),
      // dvs de ursprungliga intHomeScore/intAwayScore-värdena (innan vi subtraherade ET-målen).
      const totH = toNum(ev.intHomeScore) ?? hemma
      const totB = toNum(ev.intAwayScore) ?? borta
      if (totH != null && totB != null && totH !== totB) {
        vinnare = totH > totB ? 'H' : 'A'
      }
    }
  }

  return {
    hemmalag: LAGNAMN_MAP[ev.strHomeTeam] || ev.strHomeTeam || '',
    bortalag: LAGNAMN_MAP[ev.strAwayTeam] || ev.strAwayTeam || '',
    hemma,
    borta,
    vinnare,
    status,
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

export function tsdbV2Normalize(ev) {
  const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  const s = (ev.strStatus || '').toUpperCase()
  const status = tsdbV2Status(ev)

  // Samma logik som V1: intHomeScore är kumulativt (FT + ET + straffmål för PEN).
  // Subtrahera ET-mål och, för PEN-matcher, även straffmål för att få 90-min-resultatet.
  let hemma = toNum(ev.intHomeScore)
  let borta = toNum(ev.intAwayScore)
  const penH = toNum(ev.intHomeScoresPenaltyScore) ?? toNum(ev.intHomePenaltyScore) ?? null
  const penB = toNum(ev.intAwayScoresPenaltyScore) ?? toNum(ev.intAwayPenaltyScore) ?? null
  if (['AET', 'PEN'].includes(s) && hemma != null && borta != null) {
    const etH = toNum(ev.intHomeExtraTime) ?? 0
    const etB = toNum(ev.intAwayExtraTime) ?? 0
    hemma -= etH
    borta -= etB
    if (s === 'PEN' && penH != null && penB != null) {
      hemma -= penH
      borta -= penB
    }
  }

  // Vinnare för bracket-propagering
  let vinnare = ''
  if (['AET', 'PEN'].includes(s)) {
    if (penH != null && penB != null) {
      vinnare = penH > penB ? 'H' : penH < penB ? 'A' : ''
    } else {
      const totH = toNum(ev.intHomeScore) ?? hemma
      const totB = toNum(ev.intAwayScore) ?? borta
      if (totH != null && totB != null && totH !== totB) {
        vinnare = totH > totB ? 'H' : 'A'
      }
    }
  }

  return {
    hemmalag: LAGNAMN_MAP[ev.strHomeTeam] || ev.strHomeTeam || '',
    bortalag: LAGNAMN_MAP[ev.strAwayTeam] || ev.strAwayTeam || '',
    hemma,
    borta,
    vinnare,
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
 * @param {Array}   avslutade     normaliserade FINISHED-resultat: { hemmalag, bortalag, hemma, borta, vinnare? }
 * @param {Array[]} matcherRader  Matcher-arket: A=match_id, B=datum, C=tid, D=team1, E=team2
 * @returns {{ rader: Array[], omatchade: Array }} rader = [[match_id, hemma, borta, vinnare]]
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
    const vinnare = m.vinnare || ''   // 'H', 'A', eller '' om okänt/gruppspel

    const direkt = lookup.get(matchKey(m.hemmalag, m.bortalag))
    if (direkt) { rader.push([direkt, String(m.hemma), String(m.borta), vinnare]); continue }

    // Omvänd ordning → byt målen OCH vinnarkoden så de matchar arkets hemma/borta-kolumner
    const omvänd = lookup.get(matchKey(m.bortalag, m.hemmalag))
    if (omvänd) {
      const omvändVinnare = vinnare === 'H' ? 'A' : vinnare === 'A' ? 'H' : vinnare
      rader.push([omvänd, String(m.borta), String(m.hemma), omvändVinnare])
      continue
    }

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
 * Knockout-fixtures med riktiga lagnamn — bracketstruktur från openfootball,
 * gruppstälningar från vårt eget Resultat-ark (uppdateras var 5:e minut).
 *
 * Openfootball är källan som seedade Matcher-arket, så match `num` i JSON:en
 * matchar direkt vårt match_id: num=73 → "match_073". Vi behöver aldrig göra
 * tidsstämpelmatchning — num → match_id är en enkel konvertering.
 *
 * Flöde:
 *   1. Hämta openfootball JSON för bracketstruktur (lagkoder + match-nummer)
 *   2. Beräkna gruppstälningar:
 *        a) Primärt: från matcherRader + resultatRader (Sheets-data, alltid aktuell)
 *        b) Fallback: från openfootball-scores (om Sheets-data saknas)
 *   3. Markera position som KLAR om den är matematiskt bestämd, d.v.s.
 *      kandidatens nuvarande poäng > utmanarstyrkas maximalt möjliga poäng
 *      (detta fångar fall där vinnaren är klar INNAN sista omgången spelats)
 *   4. Lös lagkoder: "1C" → etta i Grupp C, "2B" → tvåa, "3A/B/C/D/F" → bästa 3:an
 *   5. Returnera [{ match_id, hemmalag, bortalag }] — bara när BÅDA är kända
 *
 * @param {{ matcherRader?: Array[], resultatRader?: Array[] }} [opts]
 *   Sheets-rader att använda för poängberäkning.
 *   matcherRader: Matcher!A2:H (match_id, datum, tid, hemmalag, bortalag, grupp, omgång, ...)
 *   resultatRader: Resultat!A2:C  (match_id, hemma_mål, borta_mål)
 */
const TREDJEPLACERING_TABELL = {
  'EFGHIJKL': ['3E', '3J', '3I', '3F', '3H', '3G', '3L', '3K'],
  'DFGHIJKL': ['3H', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'DEGHIJKL': ['3E', '3J', '3I', '3D', '3H', '3G', '3L', '3K'],
  'DEFHIJKL': ['3E', '3J', '3I', '3D', '3H', '3F', '3L', '3K'],
  'DEFGIJKL': ['3E', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'DEFGHJKL': ['3E', '3G', '3J', '3D', '3H', '3F', '3L', '3K'],
  'DEFGHIKL': ['3E', '3G', '3I', '3D', '3H', '3F', '3L', '3K'],
  'DEFGHIJL': ['3E', '3G', '3J', '3D', '3H', '3F', '3L', '3I'],
  'DEFGHIJK': ['3E', '3G', '3J', '3D', '3H', '3F', '3I', '3K'],
  'CFGHIJKL': ['3H', '3G', '3I', '3C', '3J', '3F', '3L', '3K'],
  'CEGHIJKL': ['3E', '3J', '3I', '3C', '3H', '3G', '3L', '3K'],
  'CEFHIJKL': ['3E', '3J', '3I', '3C', '3H', '3F', '3L', '3K'],
  'CEFGIJKL': ['3E', '3G', '3I', '3C', '3J', '3F', '3L', '3K'],
  'CEFGHJKL': ['3E', '3G', '3J', '3C', '3H', '3F', '3L', '3K'],
  'CEFGHIKL': ['3E', '3G', '3I', '3C', '3H', '3F', '3L', '3K'],
  'CEFGHIJL': ['3E', '3G', '3J', '3C', '3H', '3F', '3L', '3I'],
  'CEFGHIJK': ['3E', '3G', '3J', '3C', '3H', '3F', '3I', '3K'],
  'CDGHIJKL': ['3H', '3G', '3I', '3C', '3J', '3D', '3L', '3K'],
  'CDFHIJKL': ['3C', '3J', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDFGIJKL': ['3C', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'CDFGHJKL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3K'],
  'CDFGHIKL': ['3C', '3G', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDFGHIJL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3I'],
  'CDFGHIJK': ['3C', '3G', '3J', '3D', '3H', '3F', '3I', '3K'],
  'CDEHIJKL': ['3E', '3J', '3I', '3C', '3H', '3D', '3L', '3K'],
  'CDEGIJKL': ['3E', '3G', '3I', '3C', '3J', '3D', '3L', '3K'],
  'CDEGHJKL': ['3E', '3G', '3J', '3C', '3H', '3D', '3L', '3K'],
  'CDEGHIKL': ['3E', '3G', '3I', '3C', '3H', '3D', '3L', '3K'],
  'CDEGHIJL': ['3E', '3G', '3J', '3C', '3H', '3D', '3L', '3I'],
  'CDEGHIJK': ['3E', '3G', '3J', '3C', '3H', '3D', '3I', '3K'],
  'CDEFIJKL': ['3C', '3J', '3E', '3D', '3I', '3F', '3L', '3K'],
  'CDEFHJKL': ['3C', '3J', '3E', '3D', '3H', '3F', '3L', '3K'],
  'CDEFHIKL': ['3C', '3E', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDEFHIJL': ['3C', '3J', '3E', '3D', '3H', '3F', '3L', '3I'],
  'CDEFHIJK': ['3C', '3J', '3E', '3D', '3H', '3F', '3I', '3K'],
  'CDEFGJKL': ['3C', '3G', '3E', '3D', '3J', '3F', '3L', '3K'],
  'CDEFGIKL': ['3C', '3G', '3E', '3D', '3I', '3F', '3L', '3K'],
  'CDEFGIJL': ['3C', '3G', '3E', '3D', '3J', '3F', '3L', '3I'],
  'CDEFGIJK': ['3C', '3G', '3E', '3D', '3J', '3F', '3I', '3K'],
  'CDEFGHKL': ['3C', '3G', '3E', '3D', '3H', '3F', '3L', '3K'],
  'CDEFGHJL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3E'],
  'CDEFGHJK': ['3C', '3G', '3J', '3D', '3H', '3F', '3E', '3K'],
  'CDEFGHIL': ['3C', '3G', '3E', '3D', '3H', '3F', '3L', '3I'],
  'CDEFGHIK': ['3C', '3G', '3E', '3D', '3H', '3F', '3I', '3K'],
  'CDEFGHIJ': ['3C', '3G', '3J', '3D', '3H', '3F', '3E', '3I'],
  'BFGHIJKL': ['3H', '3J', '3B', '3F', '3I', '3G', '3L', '3K'],
  'BEGHIJKL': ['3E', '3J', '3I', '3B', '3H', '3G', '3L', '3K'],
  'BEFHIJKL': ['3E', '3J', '3B', '3F', '3I', '3H', '3L', '3K'],
  'BEFGIJKL': ['3E', '3J', '3B', '3F', '3I', '3G', '3L', '3K'],
  'BEFGHJKL': ['3E', '3J', '3B', '3F', '3H', '3G', '3L', '3K'],
  'BEFGHIKL': ['3E', '3G', '3B', '3F', '3I', '3H', '3L', '3K'],
  'BEFGHIJL': ['3E', '3J', '3B', '3F', '3H', '3G', '3L', '3I'],
  'BEFGHIJK': ['3E', '3J', '3B', '3F', '3H', '3G', '3I', '3K'],
  'BDGHIJKL': ['3H', '3J', '3B', '3D', '3I', '3G', '3L', '3K'],
  'BDFHIJKL': ['3H', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDFGIJKL': ['3I', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDFGHJKL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDFGHIKL': ['3H', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDFGHIJL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BDFGHIJK': ['3H', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BDEHIJKL': ['3E', '3J', '3B', '3D', '3I', '3H', '3L', '3K'],
  'BDEGIJKL': ['3E', '3J', '3B', '3D', '3I', '3G', '3L', '3K'],
  'BDEGHJKL': ['3E', '3J', '3B', '3D', '3H', '3G', '3L', '3K'],
  'BDEGHIKL': ['3E', '3G', '3B', '3D', '3I', '3H', '3L', '3K'],
  'BDEGHIJL': ['3E', '3J', '3B', '3D', '3H', '3G', '3L', '3I'],
  'BDEGHIJK': ['3E', '3J', '3B', '3D', '3H', '3G', '3I', '3K'],
  'BDEFIJKL': ['3E', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDEFHJKL': ['3E', '3J', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFHIKL': ['3E', '3I', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFHIJL': ['3E', '3J', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BDEFHIJK': ['3E', '3J', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BDEFGJKL': ['3E', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDEFGIKL': ['3E', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDEFGIJL': ['3E', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BDEFGIJK': ['3E', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BDEFGHKL': ['3E', '3G', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFGHJL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3E'],
  'BDEFGHJK': ['3H', '3G', '3B', '3D', '3J', '3F', '3E', '3K'],
  'BDEFGHIL': ['3E', '3G', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BDEFGHIK': ['3E', '3G', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BDEFGHIJ': ['3H', '3G', '3B', '3D', '3J', '3F', '3E', '3I'],
  'BCGHIJKL': ['3H', '3J', '3B', '3C', '3I', '3G', '3L', '3K'],
  'BCFHIJKL': ['3H', '3J', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCFGIJKL': ['3I', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCFGHJKL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCFGHIKL': ['3H', '3G', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCFGHIJL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3I'],
  'BCFGHIJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3I', '3K'],
  'BCEHIJKL': ['3E', '3J', '3B', '3C', '3I', '3H', '3L', '3K'],
  'BCEGIJKL': ['3E', '3J', '3B', '3C', '3I', '3G', '3L', '3K'],
  'BCEGHJKL': ['3E', '3J', '3B', '3C', '3H', '3G', '3L', '3K'],
  'BCEGHIKL': ['3E', '3G', '3B', '3C', '3I', '3H', '3L', '3K'],
  'BCEGHIJL': ['3E', '3J', '3B', '3C', '3H', '3G', '3L', '3I'],
  'BCEGHIJK': ['3E', '3J', '3B', '3C', '3H', '3G', '3I', '3K'],
  'BCEFIJKL': ['3E', '3J', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCEFHJKL': ['3E', '3J', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFHIKL': ['3E', '3I', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFHIJL': ['3E', '3J', '3B', '3C', '3H', '3F', '3L', '3I'],
  'BCEFHIJK': ['3E', '3J', '3B', '3C', '3H', '3F', '3I', '3K'],
  'BCEFGJKL': ['3E', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCEFGIKL': ['3E', '3G', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCEFGIJL': ['3E', '3G', '3B', '3C', '3J', '3F', '3L', '3I'],
  'BCEFGIJK': ['3E', '3G', '3B', '3C', '3J', '3F', '3I', '3K'],
  'BCEFGHKL': ['3E', '3G', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFGHJL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3E'],
  'BCEFGHJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3E', '3K'],
  'BCEFGHIL': ['3E', '3G', '3B', '3C', '3H', '3F', '3L', '3I'],
  'BCEFGHIK': ['3E', '3G', '3B', '3C', '3H', '3F', '3I', '3K'],
  'BCEFGHIJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3E', '3I'],
  'BCDHIJKL': ['3H', '3J', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDGIJKL': ['3I', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDGHJKL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDGHIKL': ['3H', '3G', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDGHIJL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3I'],
  'BCDGHIJK': ['3H', '3G', '3B', '3C', '3J', '3D', '3I', '3K'],
  'BCDFIJKL': ['3C', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDFHJKL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFHIKL': ['3C', '3I', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFHIJL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDFHIJK': ['3C', '3J', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDFGJKL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BCDFGIKL': ['3C', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDFGIJL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BCDFGIJK': ['3C', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BCDFGHKL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFGHJL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3J'],
  'BCDFGHJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3K'],
  'BCDFGHIL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDFGHIK': ['3C', '3G', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDFGHIJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3I'],
  'BCDEIJKL': ['3E', '3J', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDEHJKL': ['3E', '3J', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEHIKL': ['3E', '3I', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEHIJL': ['3E', '3J', '3B', '3C', '3H', '3D', '3L', '3I'],
  'BCDEHIJK': ['3E', '3J', '3B', '3C', '3H', '3D', '3I', '3K'],
  'BCDEGJKL': ['3E', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDEGIKL': ['3E', '3G', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDEGIJL': ['3E', '3G', '3B', '3C', '3J', '3D', '3L', '3I'],
  'BCDEGIJK': ['3E', '3G', '3B', '3C', '3J', '3D', '3I', '3K'],
  'BCDEGHKL': ['3E', '3G', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEGHJL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3E'],
  'BCDEGHJK': ['3H', '3G', '3B', '3C', '3J', '3D', '3E', '3K'],
  'BCDEGHIL': ['3E', '3G', '3B', '3C', '3H', '3D', '3L', '3I'],
  'BCDEGHIK': ['3E', '3G', '3B', '3C', '3H', '3D', '3I', '3K'],
  'BCDEGHIJ': ['3H', '3G', '3B', '3C', '3J', '3D', '3E', '3I'],
  'BCDEFJKL': ['3C', '3J', '3B', '3D', '3E', '3F', '3L', '3K'],
  'BCDEFIKL': ['3C', '3E', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDEFIJL': ['3C', '3J', '3B', '3D', '3E', '3F', '3L', '3I'],
  'BCDEFIJK': ['3C', '3J', '3B', '3D', '3E', '3F', '3I', '3K'],
  'BCDEFHKL': ['3C', '3E', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDEFHJL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3E'],
  'BCDEFHJK': ['3C', '3J', '3B', '3D', '3H', '3F', '3E', '3K'],
  'BCDEFHIL': ['3C', '3E', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDEFHIK': ['3C', '3E', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDEFHIJ': ['3C', '3J', '3B', '3D', '3H', '3F', '3E', '3I'],
  'BCDEFGKL': ['3C', '3G', '3B', '3D', '3E', '3F', '3L', '3K'],
  'BCDEFGJL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3E'],
  'BCDEFGJK': ['3C', '3G', '3B', '3D', '3J', '3F', '3E', '3K'],
  'BCDEFGIL': ['3C', '3G', '3B', '3D', '3E', '3F', '3L', '3I'],
  'BCDEFGIK': ['3C', '3G', '3B', '3D', '3E', '3F', '3I', '3K'],
  'BCDEFGIJ': ['3C', '3G', '3B', '3D', '3J', '3F', '3E', '3I'],
  'BCDEFGHL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3E'],
  'BCDEFGHK': ['3C', '3G', '3B', '3D', '3H', '3F', '3E', '3K'],
  'BCDEFGHJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3E'],
  'BCDEFGHI': ['3C', '3G', '3B', '3D', '3H', '3F', '3E', '3I'],
  'AFGHIJKL': ['3H', '3J', '3I', '3F', '3A', '3G', '3L', '3K'],
  'AEGHIJKL': ['3E', '3J', '3I', '3A', '3H', '3G', '3L', '3K'],
  'AEFHIJKL': ['3E', '3J', '3I', '3F', '3A', '3H', '3L', '3K'],
  'AEFGIJKL': ['3E', '3J', '3I', '3F', '3A', '3G', '3L', '3K'],
  'AEFGHJKL': ['3E', '3G', '3J', '3F', '3A', '3H', '3L', '3K'],
  'AEFGHIKL': ['3E', '3G', '3I', '3F', '3A', '3H', '3L', '3K'],
  'AEFGHIJL': ['3E', '3G', '3J', '3F', '3A', '3H', '3L', '3I'],
  'AEFGHIJK': ['3E', '3G', '3J', '3F', '3A', '3H', '3I', '3K'],
  'ADGHIJKL': ['3H', '3J', '3I', '3D', '3A', '3G', '3L', '3K'],
  'ADFHIJKL': ['3H', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADFGIJKL': ['3I', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHJKL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHIKL': ['3H', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHIJL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ADFGHIJK': ['3H', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ADEHIJKL': ['3E', '3J', '3I', '3D', '3A', '3H', '3L', '3K'],
  'ADEGIJKL': ['3E', '3J', '3I', '3D', '3A', '3G', '3L', '3K'],
  'ADEGHJKL': ['3E', '3G', '3J', '3D', '3A', '3H', '3L', '3K'],
  'ADEGHIKL': ['3E', '3G', '3I', '3D', '3A', '3H', '3L', '3K'],
  'ADEGHIJL': ['3E', '3G', '3J', '3D', '3A', '3H', '3L', '3I'],
  'ADEGHIJK': ['3E', '3G', '3J', '3D', '3A', '3H', '3I', '3K'],
  'ADEFIJKL': ['3E', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHJKL': ['3H', '3J', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHIKL': ['3H', '3E', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHIJL': ['3H', '3J', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ADEFHIJK': ['3H', '3J', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGJKL': ['3E', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGIKL': ['3E', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGIJL': ['3E', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ADEFGIJK': ['3E', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGHKL': ['3H', '3G', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGHJL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3E'],
  'ADEFGHJK': ['3H', '3G', '3J', '3D', '3A', '3F', '3E', '3K'],
  'ADEFGHIL': ['3H', '3G', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ADEFGHIK': ['3H', '3G', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGHIJ': ['3H', '3G', '3J', '3D', '3A', '3F', '3E', '3I'],
  'ACGHIJKL': ['3H', '3J', '3I', '3C', '3A', '3G', '3L', '3K'],
  'ACFHIJKL': ['3H', '3J', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACFGIJKL': ['3I', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHJKL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHIKL': ['3H', '3G', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHIJL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3I'],
  'ACFGHIJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3I', '3K'],
  'ACEHIJKL': ['3E', '3J', '3I', '3C', '3A', '3H', '3L', '3K'],
  'ACEGIJKL': ['3E', '3J', '3I', '3C', '3A', '3G', '3L', '3K'],
  'ACEGHJKL': ['3E', '3G', '3J', '3C', '3A', '3H', '3L', '3K'],
  'ACEGHIKL': ['3E', '3G', '3I', '3C', '3A', '3H', '3L', '3K'],
  'ACEGHIJL': ['3E', '3G', '3J', '3C', '3A', '3H', '3L', '3I'],
  'ACEGHIJK': ['3E', '3G', '3J', '3C', '3A', '3H', '3I', '3K'],
  'ACEFIJKL': ['3E', '3J', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHJKL': ['3H', '3J', '3E', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHIKL': ['3H', '3E', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHIJL': ['3H', '3J', '3E', '3C', '3A', '3F', '3L', '3I'],
  'ACEFHIJK': ['3H', '3J', '3E', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGJKL': ['3E', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGIKL': ['3E', '3G', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGIJL': ['3E', '3G', '3J', '3C', '3A', '3F', '3L', '3I'],
  'ACEFGIJK': ['3E', '3G', '3J', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGHKL': ['3H', '3G', '3E', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGHJL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3E'],
  'ACEFGHJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3E', '3K'],
  'ACEFGHIL': ['3H', '3G', '3E', '3C', '3A', '3F', '3L', '3I'],
  'ACEFGHIK': ['3H', '3G', '3E', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGHIJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3E', '3I'],
  'ACDHIJKL': ['3H', '3J', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDGIJKL': ['3I', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHJKL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHIKL': ['3H', '3G', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHIJL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3I'],
  'ACDGHIJK': ['3H', '3G', '3J', '3C', '3A', '3D', '3I', '3K'],
  'ACDFIJKL': ['3C', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDFHJKL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDFHIKL': ['3H', '3F', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDFHIJL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDFHIJK': ['3H', '3J', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDFGJKL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ACDFGIKL': ['3C', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDFGIJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ACDFGIJK': ['3C', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ACDFGHKL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDFGHJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3H'],
  'ACDFGHJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3K'],
  'ACDFGHIL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDFGHIK': ['3H', '3G', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDFGHIJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3I'],
  'ACDEIJKL': ['3E', '3J', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHJKL': ['3H', '3J', '3E', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHIKL': ['3H', '3E', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHIJL': ['3H', '3J', '3E', '3C', '3A', '3D', '3L', '3I'],
  'ACDEHIJK': ['3H', '3J', '3E', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGJKL': ['3E', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGIKL': ['3E', '3G', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGIJL': ['3E', '3G', '3J', '3C', '3A', '3D', '3L', '3I'],
  'ACDEGIJK': ['3E', '3G', '3J', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGHKL': ['3H', '3G', '3E', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGHJL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3E'],
  'ACDEGHJK': ['3H', '3G', '3J', '3C', '3A', '3D', '3E', '3K'],
  'ACDEGHIL': ['3H', '3G', '3E', '3C', '3A', '3D', '3L', '3I'],
  'ACDEGHIK': ['3H', '3G', '3E', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGHIJ': ['3H', '3G', '3J', '3C', '3A', '3D', '3E', '3I'],
  'ACDEFJKL': ['3C', '3J', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFIKL': ['3C', '3E', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFIJL': ['3C', '3J', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ACDEFIJK': ['3C', '3J', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ACDEFHKL': ['3H', '3E', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDEFHJL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3E'],
  'ACDEFHJK': ['3H', '3J', '3E', '3C', '3A', '3F', '3D', '3K'],
  'ACDEFHIL': ['3H', '3E', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDEFHIK': ['3H', '3E', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDEFHIJ': ['3H', '3J', '3E', '3C', '3A', '3F', '3D', '3I'],
  'ACDEFGKL': ['3C', '3G', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFGJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3E'],
  'ACDEFGJK': ['3C', '3G', '3J', '3D', '3A', '3F', '3E', '3K'],
  'ACDEFGIL': ['3C', '3G', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ACDEFGIK': ['3C', '3G', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ACDEFGIJ': ['3C', '3G', '3J', '3D', '3A', '3F', '3E', '3I'],
  'ACDEFGHL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3E'],
  'ACDEFGHK': ['3H', '3G', '3E', '3C', '3A', '3F', '3D', '3K'],
  'ACDEFGHJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3E'],
  'ACDEFGHI': ['3H', '3G', '3E', '3C', '3A', '3F', '3D', '3I'],
  'ABGHIJKL': ['3H', '3J', '3B', '3A', '3I', '3G', '3L', '3K'],
  'ABFHIJKL': ['3H', '3J', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABFGIJKL': ['3I', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABFGHJKL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABFGHIKL': ['3H', '3G', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABFGHIJL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABFGHIJK': ['3H', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABEHIJKL': ['3E', '3J', '3B', '3A', '3I', '3H', '3L', '3K'],
  'ABEGIJKL': ['3E', '3J', '3B', '3A', '3I', '3G', '3L', '3K'],
  'ABEGHJKL': ['3E', '3J', '3B', '3A', '3H', '3G', '3L', '3K'],
  'ABEGHIKL': ['3E', '3G', '3B', '3A', '3I', '3H', '3L', '3K'],
  'ABEGHIJL': ['3E', '3J', '3B', '3A', '3H', '3G', '3L', '3I'],
  'ABEGHIJK': ['3E', '3J', '3B', '3A', '3H', '3G', '3I', '3K'],
  'ABEFIJKL': ['3E', '3J', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABEFHJKL': ['3E', '3J', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFHIKL': ['3E', '3I', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFHIJL': ['3E', '3J', '3B', '3F', '3A', '3H', '3L', '3I'],
  'ABEFHIJK': ['3E', '3J', '3B', '3F', '3A', '3H', '3I', '3K'],
  'ABEFGJKL': ['3E', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABEFGIKL': ['3E', '3G', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABEFGIJL': ['3E', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABEFGIJK': ['3E', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABEFGHKL': ['3E', '3G', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFGHJL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3E'],
  'ABEFGHJK': ['3H', '3J', '3B', '3F', '3A', '3G', '3E', '3K'],
  'ABEFGHIL': ['3E', '3G', '3B', '3F', '3A', '3H', '3L', '3I'],
  'ABEFGHIK': ['3E', '3G', '3B', '3F', '3A', '3H', '3I', '3K'],
  'ABEFGHIJ': ['3H', '3J', '3B', '3F', '3A', '3G', '3E', '3I'],
  'ABDHIJKL': ['3I', '3J', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDGIJKL': ['3I', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDGHJKL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDGHIKL': ['3I', '3G', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDGHIJL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDGHIJK': ['3H', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDFIJKL': ['3I', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHJKL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHIKL': ['3H', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHIJL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDFHIJK': ['3H', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDFGJKL': ['3F', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDFGIKL': ['3I', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFGIJL': ['3F', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDFGIJK': ['3F', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDFGHKL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFGHJL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABDFGHJK': ['3H', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABDFGHIL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDFGHIK': ['3H', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDFGHIJ': ['3H', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABDEIJKL': ['3E', '3J', '3B', '3A', '3I', '3D', '3L', '3K'],
  'ABDEHJKL': ['3E', '3J', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEHIKL': ['3E', '3I', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEHIJL': ['3E', '3J', '3B', '3D', '3A', '3H', '3L', '3I'],
  'ABDEHIJK': ['3E', '3J', '3B', '3D', '3A', '3H', '3I', '3K'],
  'ABDEGJKL': ['3E', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDEGIKL': ['3E', '3G', '3B', '3A', '3I', '3D', '3L', '3K'],
  'ABDEGIJL': ['3E', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDEGIJK': ['3E', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDEGHKL': ['3E', '3G', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEGHJL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3E'],
  'ABDEGHJK': ['3H', '3J', '3B', '3D', '3A', '3G', '3E', '3K'],
  'ABDEGHIL': ['3E', '3G', '3B', '3D', '3A', '3H', '3L', '3I'],
  'ABDEGHIK': ['3E', '3G', '3B', '3D', '3A', '3H', '3I', '3K'],
  'ABDEGHIJ': ['3H', '3J', '3B', '3D', '3A', '3G', '3E', '3I'],
  'ABDEFJKL': ['3E', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFIKL': ['3E', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFIJL': ['3E', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFIJK': ['3E', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFHKL': ['3H', '3E', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFHJL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABDEFHJK': ['3H', '3J', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABDEFHIL': ['3H', '3E', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFHIK': ['3H', '3E', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFHIJ': ['3H', '3J', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABDEFGKL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFGJL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABDEFGJK': ['3E', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABDEFGIL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFGIK': ['3E', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFGIJ': ['3E', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABDEFGHL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABDEFGHK': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABDEFGHJ': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3J'],
  'ABDEFGHI': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCHIJKL': ['3I', '3J', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCGIJKL': ['3I', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCGHJKL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCGHIKL': ['3I', '3G', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCGHIJL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3I'],
  'ABCGHIJK': ['3H', '3J', '3B', '3C', '3A', '3G', '3I', '3K'],
  'ABCFIJKL': ['3I', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHJKL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHIKL': ['3H', '3I', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHIJL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCFHIJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCFGJKL': ['3C', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABCFGIKL': ['3I', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFGIJL': ['3C', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABCFGIJK': ['3C', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABCFGHKL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFGHJL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3J'],
  'ABCFGHJK': ['3H', '3G', '3B', '3C', '3A', '3F', '3J', '3K'],
  'ABCFGHIL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCFGHIK': ['3H', '3G', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCFGHIJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3I', '3J'],
  'ABCEIJKL': ['3E', '3J', '3B', '3A', '3I', '3C', '3L', '3K'],
  'ABCEHJKL': ['3E', '3J', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEHIKL': ['3E', '3I', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEHIJL': ['3E', '3J', '3B', '3C', '3A', '3H', '3L', '3I'],
  'ABCEHIJK': ['3E', '3J', '3B', '3C', '3A', '3H', '3I', '3K'],
  'ABCEGJKL': ['3E', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCEGIKL': ['3E', '3G', '3B', '3A', '3I', '3C', '3L', '3K'],
  'ABCEGIJL': ['3E', '3J', '3B', '3C', '3A', '3G', '3L', '3I'],
  'ABCEGIJK': ['3E', '3J', '3B', '3C', '3A', '3G', '3I', '3K'],
  'ABCEGHKL': ['3E', '3G', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEGHJL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3E'],
  'ABCEGHJK': ['3H', '3J', '3B', '3C', '3A', '3G', '3E', '3K'],
  'ABCEGHIL': ['3E', '3G', '3B', '3C', '3A', '3H', '3L', '3I'],
  'ABCEGHIK': ['3E', '3G', '3B', '3C', '3A', '3H', '3I', '3K'],
  'ABCEGHIJ': ['3H', '3J', '3B', '3C', '3A', '3G', '3E', '3I'],
  'ABCEFJKL': ['3E', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFIKL': ['3E', '3I', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFIJL': ['3E', '3J', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFIJK': ['3E', '3J', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFHKL': ['3H', '3E', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFHJL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3E'],
  'ABCEFHJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3E', '3K'],
  'ABCEFHIL': ['3H', '3E', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFHIK': ['3H', '3E', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFHIJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3E', '3I'],
  'ABCEFGKL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFGJL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3J'],
  'ABCEFGJK': ['3E', '3G', '3B', '3C', '3A', '3F', '3J', '3K'],
  'ABCEFGIL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFGIK': ['3E', '3G', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFGIJ': ['3E', '3G', '3B', '3C', '3A', '3F', '3I', '3J'],
  'ABCEFGHL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3E'],
  'ABCEFGHK': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3K'],
  'ABCEFGHJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3J'],
  'ABCEFGHI': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3I'],
  'ABCDIJKL': ['3I', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHJKL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHIKL': ['3H', '3I', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHIJL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDHIJK': ['3H', '3J', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDGJKL': ['3C', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABCDGIKL': ['3I', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDGIJL': ['3C', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABCDGIJK': ['3C', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABCDGHKL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDGHJL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3J'],
  'ABCDGHJK': ['3H', '3G', '3B', '3C', '3A', '3D', '3J', '3K'],
  'ABCDGHIL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDGHIK': ['3H', '3G', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDGHIJ': ['3H', '3G', '3B', '3C', '3A', '3D', '3I', '3J'],
  'ABCDFJKL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFIKL': ['3C', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFIJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDFIJK': ['3C', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDFHKL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDFHJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3H'],
  'ABCDFHJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDFHIL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDFHIK': ['3H', '3F', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDFHIJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDFGKL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFGJL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABCDFGJK': ['3C', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABCDFGIL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDFGIK': ['3C', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDFGIJ': ['3C', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABCDFGHL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3H'],
  'ABCDFGHK': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDFGHJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3J'],
  'ABCDFGHI': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDEJKL': ['3E', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEIKL': ['3E', '3I', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEIJL': ['3E', '3J', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEIJK': ['3E', '3J', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEHKL': ['3H', '3E', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEHJL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEHJK': ['3H', '3J', '3B', '3C', '3A', '3D', '3E', '3K'],
  'ABCDEHIL': ['3H', '3E', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEHIK': ['3H', '3E', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEHIJ': ['3H', '3J', '3B', '3C', '3A', '3D', '3E', '3I'],
  'ABCDEGKL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEGJL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3J'],
  'ABCDEGJK': ['3E', '3G', '3B', '3C', '3A', '3D', '3J', '3K'],
  'ABCDEGIL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEGIK': ['3E', '3G', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEGIJ': ['3E', '3G', '3B', '3C', '3A', '3D', '3I', '3J'],
  'ABCDEGHL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEGHK': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3K'],
  'ABCDEGHJ': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3J'],
  'ABCDEGHI': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3I'],
  'ABCDEFKL': ['3C', '3E', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDEFJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABCDEFJK': ['3C', '3J', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABCDEFIL': ['3C', '3E', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDEFIK': ['3C', '3E', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDEFIJ': ['3C', '3J', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCDEFHL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEFHK': ['3H', '3E', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDEFHJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3E'],
  'ABCDEFHI': ['3H', '3E', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDEFGL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABCDEFGK': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABCDEFGJ': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3J'],
  'ABCDEFGI': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCDEFGH': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3E'],
}

// Mappar 3:e plats-slot-mönster → kolumnindex i TREDJEPLACERING_TABELL
// Kolumnordning: [1A(m79), 1B(m85), 1D(m81), 1E(m74), 1G(m82), 1I(m77), 1K(m87), 1L(m80)]
const SLOT_TILL_KOLUMN = {
  'A/B/C/D/F': 3, // 1E (match 74)
  'C/D/F/G/H': 5, // 1I (match 77)
  'C/E/F/H/I': 0, // 1A (match 79)
  'E/H/I/J/K': 7, // 1L (match 80)
  'B/E/F/I/J': 2, // 1D (match 81)
  'A/E/H/I/J': 4, // 1G (match 82)
  'E/F/G/I/J': 1, // 1B (match 85)
  'D/E/I/J/L': 6, // 1K (match 87)
}

/**
 * Hämtar conduct score per lag (för grupp-matcher) från football-data.org.
 * Conduct score: gult kort = -1, rött kort = -3, andra gult (YELLOW_RED) = -3.
 * Returnerar { lagnamn: poäng } — högre = bättre uppförande (färre kort).
 * Returnerar {} om nyckeln saknas eller anropet misslyckas (graciös nedgradering).
 */
async function hämtaKortPoäng() {
  if (!process.env.FOOTBALL_DATA_KEY) return {}
  try {
    const res = await fetch(
      `${FD_BASE}/competitions/${FD_COMPETITION}/matches?season=${FD_SEASON}&status=FINISHED`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } },
    )
    if (!res.ok) return {}
    const data = await res.json()
    const poäng = {}
    for (const m of (data.matches || [])) {
      if (!m.group) continue   // bara gruppspelets matcher
      for (const b of (m.bookings || [])) {
        const namn = LAGNAMN_MAP[b.team?.name] || b.team?.name
        if (!namn) continue
        if (!poäng[namn]) poäng[namn] = 0
        if (b.type === 'YELLOW_CARD')      poäng[namn] -= 1
        else if (b.type === 'RED_CARD')    poäng[namn] -= 3
        else if (b.type === 'YELLOW_RED_CARD') poäng[namn] -= 3  // 2:a gult → rött
      }
    }
    return poäng
  } catch {
    return {}
  }
}

export async function getAllKnockoutFixtures({ matcherRader = null, resultatRader = null } = {}) {
  const OPENFOOTBALL_URL =
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

  let data
  try {
    const res = await fetch(OPENFOOTBALL_URL)
    if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`)
    data = await res.json()
  } catch (err) {
    console.warn('[resultsSource] getAllKnockoutFixtures — openfootball-hämtning misslyckades:', err.message)
    return []
  }

  const allaMatcher = data.matches || []

  // ── Hjälp: beräkna stälning från en lista {team1, team2, score.ft} ─────────
  const beräknaStällning = (matcher) => {
    const teams = {}
    // Steg 1: beräkna totala poäng/statistik
    for (const m of matcher) {
      const [g1, g2] = m.score.ft
      for (const [lag, egna, mot] of [[m.team1, g1, g2], [m.team2, g2, g1]]) {
        if (!teams[lag]) teams[lag] = { P: 0, GD: 0, GF: 0 }
        teams[lag].GF += egna
        teams[lag].GD += egna - mot
        teams[lag].P  += egna > mot ? 3 : egna === mot ? 1 : 0
      }
    }
    let ställning = Object.entries(teams).map(([namn, s]) => ({ namn, ...s }))

    // Steg 2: sortera på totala poäng
    ställning.sort((a, b) => b.P - a.P)

    // Steg 3: för poänglika grupper → inbördes möten som tiebreaker
    let i = 0
    while (i < ställning.length) {
      let j = i
      while (j < ställning.length && ställning[j].P === ställning[i].P) j++
      if (j - i > 1) {
        const bundna    = ställning.slice(i, j)
        const bundnaNamn = new Set(bundna.map((t) => t.namn))
        const h2hMatcher = matcher.filter(
          (m) => bundnaNamn.has(m.team1) && bundnaNamn.has(m.team2),
        )
        // Mini-liga bland de bundna lagen
        const h2h = Object.fromEntries(bundna.map((t) => [t.namn, { P: 0, GD: 0, GF: 0 }]))
        for (const m of h2hMatcher) {
          const [g1, g2] = m.score.ft
          h2h[m.team1].GF += g1; h2h[m.team1].GD += g1 - g2
          h2h[m.team2].GF += g2; h2h[m.team2].GD += g2 - g1
          if (g1 > g2)       { h2h[m.team1].P += 3 }
          else if (g1 < g2)  { h2h[m.team2].P += 3 }
          else               { h2h[m.team1].P++; h2h[m.team2].P++ }
        }
        bundna.sort((a, b) =>
          (h2h[b.namn].P  - h2h[a.namn].P)  ||   // inbördes poäng
          (h2h[b.namn].GD - h2h[a.namn].GD) ||   // inbördes målskillnad
          (h2h[b.namn].GF - h2h[a.namn].GF) ||   // inbördes gjorda mål
          (b.GD - a.GD) || (b.GF - a.GF) ||      // totala GD / GF
          a.namn.localeCompare(b.namn),            // bokstavsordning (sista utväg)
        )
        for (let k = 0; k < bundna.length; k++) ställning[i + k] = bundna[k]
      }
      i = j
    }
    return ställning
  }

  // ── Hjälp: är platsen matematiskt bestämd? ────────────────────────────────
  // Returnerar true om kandidaten vid `plats` (0=etta, 1=tvåa) inte KAN
  // bli omsprungen av någon annan — oavsett hur kvarvarande matcher slutar.
  const erPositionKlar = (ställning, speladeMatcher, plats) => {
    if (plats >= ställning.length) return false
    const kandidat = ställning[plats]
    const totalPerLag = ställning.length - 1   // 4-lagsgrupp: 3 matcher per lag

    // Räkna spelade matcher per lag
    const spelatPerLag = Object.fromEntries(ställning.map((t) => [t.namn, 0]))
    for (const m of speladeMatcher) {
      if (spelatPerLag[m.team1] !== undefined) spelatPerLag[m.team1]++
      if (spelatPerLag[m.team2] !== undefined) spelatPerLag[m.team2]++
    }

    // Om alla matcher är spelade är stälningen definitiv — H2H/GD/GF är redan
    // inbakade i `ständning` av beräknaStällning(). Inget kan ändras.
    if (ställning.every((t) => (spelatPerLag[t.namn] || 0) >= totalPerLag)) return true

    // Kan någon utmanare (plats+1 och nedåt) nå lika eller fler poäng?
    for (let i = plats + 1; i < ställning.length; i++) {
      const utmanare = ställning[i]
      const kvar    = totalPerLag - (spelatPerLag[utmanare.namn] || 0)
      const maxPoäng = utmanare.P + 3 * kvar
      if (kandidat.P > maxPoäng) continue   // kan inte nå upp — ingen fara

      // Utmanaren KAN nå lika poäng → kolla det inbördes mötet
      // Om kandidaten redan VUNNIT det mötet kan utmanaren aldrig gå om via tiebreakern
      const h2h = speladeMatcher.find((m) =>
        (m.team1 === kandidat.namn && m.team2 === utmanare.namn) ||
        (m.team1 === utmanare.namn && m.team2 === kandidat.namn),
      )
      if (!h2h) return false   // mötet inte spelat ännu → oklart

      const [g1, g2] = h2h.score.ft
      const kandidatVann = (h2h.team1 === kandidat.namn && g1 > g2) ||
                           (h2h.team2 === kandidat.namn && g2 > g1)
      if (!kandidatVann) return false   // oavgjort eller förlust → oklart
      // kandidaten vann det inbördes mötet → utmanaren neutraliserad
    }
    return true
  }

  // ── Steg 1: Bygg grupperMatcher ───────────────────────────────────────────
  let grupperMatcher = {}   // { 'A': [{team1,team2,score:{ft:[g1,g2]}},...], ... }

  if (matcherRader && resultatRader) {
    // ── Primär: Sheets-data (alltid aktuell) ─────────────────────────────────
    const matchInfo = {}
    for (const rad of matcherRader) {
      const [match_id, , , hemmalag, bortalag, grupp] = rad
      if (!match_id || !grupp || !hemmalag || !bortalag) continue
      // Gruppspelets rader har grupp="Group A" (7 tecken), knockout har 'Slutspel' eller liknande
      if (!grupp.startsWith('Group ') || grupp.length !== 7) continue
      matchInfo[match_id] = { hemmalag, bortalag, grp: grupp[6] }   // "Group A"[6] = "A"
    }
    for (const res of resultatRader) {
      const [match_id, g1Str, g2Str] = res
      if (!match_id) continue
      const g1 = parseInt(g1Str)
      const g2 = parseInt(g2Str)
      if (isNaN(g1) || isNaN(g2)) continue
      const info = matchInfo[match_id]
      if (!info) continue
      if (!grupperMatcher[info.grp]) grupperMatcher[info.grp] = []
      grupperMatcher[info.grp].push({ team1: info.hemmalag, team2: info.bortalag, score: { ft: [g1, g2] } })
    }
    console.log(`[resultsSource] getAllKnockoutFixtures: använder Sheets-data (${Object.keys(grupperMatcher).length} grupper med resultat)`)
  } else {
    // ── Fallback: openfootball-scores ─────────────────────────────────────────
    for (const m of allaMatcher) {
      if (!m.group || !m.score?.ft) continue
      const grp = m.group.replace('Group ', '')
      if (!grupperMatcher[grp]) grupperMatcher[grp] = []
      grupperMatcher[grp].push(m)
    }
    console.log(`[resultsSource] getAllKnockoutFixtures: använder openfootball-scores (Sheets-data saknas)`)
  }

  // ── Steg 2: Beräkna stälningar ────────────────────────────────────────────
  const grupperStällning = {}   // { 'A': [{namn,P,GD,GF}, ...], ... }

  for (const [grp, matcher] of Object.entries(grupperMatcher)) {
    grupperStällning[grp] = beräknaStällning(matcher)
  }

  // ── Steg 3: Rangordna bästa 3:or (de bästa 8 av 12 grupper går vidare) ────
  // En 3:a räknas in bara om dess position matematiskt är bestämd (gruppen klar)
  const grupperHeltKlara = new Set()   // alla matcher spelade → säkert för 3:or
  for (const [grp, matcher] of Object.entries(grupperMatcher)) {
    const antalLag  = grupperStällning[grp]?.length || 0
    const förväntade = antalLag === 4 ? 6 : antalLag === 3 ? 3 : antalLag * (antalLag - 1) / 2
    if (matcher.length >= förväntade) grupperHeltKlara.add(grp)
  }

  const tredjeLag = []   // { grp, namn, P, GD, GF }
  for (const [grp, ställning] of Object.entries(grupperStällning)) {
    if (grupperHeltKlara.has(grp) && ställning.length >= 3) {
      tredjeLag.push({ grp, ...ställning[2] })
    }
  }
  // Conduct score (kortdata) — hämtas från football-data.org för korrekt FIFA-rankning
  const kortPoäng = await hämtaKortPoäng()

  // FIFAs officiella rankingordning bland tabelltreor:
  // 1. Poäng  2. Målskillnad  3. Gjorda mål  4. Conduct score  5. FIFA-rankning
  tredjeLag.sort((a, b) =>
    b.P  - a.P  ||                                                       // 1. Poäng
    b.GD - a.GD ||                                                       // 2. Målskillnad
    b.GF - a.GF ||                                                       // 3. Gjorda mål
    (kortPoäng[b.namn] || 0) - (kortPoäng[a.namn] || 0)         ||      // 4. Conduct score (högre = bättre)
    (FIFA_RANKNING_2026[a.namn] || 999) - (FIFA_RANKNING_2026[b.namn] || 999) || // 5. FIFA-rankning (lägre = bättre)
    a.namn.localeCompare(b.namn)                                         // 6. Lottning (sista utväg)
  )
  const kvalificerade3orGrupper = new Set(tredjeLag.slice(0, 8).map((t) => t.grp))

  // ── Steg 4: Lös lagkoder → riktiga lagnamn ─────────────────────────────────
  const lös = (kod) => {
    if (!kod) return null

    // "1C" eller "2B" — etta/tvåa i gruppen
    const exakt = kod.match(/^([12])([A-L])$/)
    if (exakt) {
      const plats = parseInt(exakt[1]) - 1
      const grp   = exakt[2]
      const ställning = grupperStällning[grp]
      if (!ställning) return null
      const speladeMatcher = grupperMatcher[grp] || []
      if (!erPositionKlar(ställning, speladeMatcher, plats)) return null
      return ställning[plats]?.namn ?? null
    }

    // "3A/B/C/D/F" — 3:e plats-slot, löses via FIFAs 495-kombinationstabell.
    // Kräver att ALLA 12 grupper är klara — annars kan okända grupper producera
    // bättre 3:or som ändrar rankningen och välter tilldelningen.
    const tredjeMatch = kod.match(/^3([A-L](?:\/[A-L])*)$/)
    if (tredjeMatch) {
      const TOTALT_GRUPPER = 12
      if (grupperHeltKlara.size < TOTALT_GRUPPER) return null
      const slotMönster = tredjeMatch[1]                          // "E/F/G/I/J"
      const kolIndex = SLOT_TILL_KOLUMN[slotMönster]
      if (kolIndex === undefined) return null
      const kvalNyckel = [...kvalificerade3orGrupper].sort().join('')  // "BCDEFGHJ"
      const rad = TREDJEPLACERING_TABELL[kvalNyckel]
      if (!rad) return null
      const tredjeGruppKod = rad[kolIndex]                        // "3E"
      const grp = tredjeGruppKod[1]                               // "E"
      return grupperStällning[grp]?.[2]?.namn ?? null
    }

    // "W73", "L101" etc. — vinnare/förlorare av en knockout-match
    // Slå upp matchen i Matcher-arket (riktiga lagnamn) + Resultat-arket (score + vinnare).
    const wlMatch = kod.match(/^([WL])(\d+)$/)
    if (wlMatch) {
      const [, typ, numStr] = wlMatch
      const matchId = `match_${String(numStr).padStart(3, '0')}`

      // Hitta lagnamn från Matcher-arket (kolumn D/E)
      const matchRad = matcherRader?.find((r) => r[0] === matchId)
      if (!matchRad) return null
      const hemmalag = matchRad[3]
      const bortalag = matchRad[4]
      // Hoppa över om något lag fortfarande är en platshållare
      if (!hemmalag || !bortalag) return null
      if (/^[12][A-L]$/.test(hemmalag) || /^3[A-L]/.test(hemmalag) ||
          /^[WL]\d+$/.test(hemmalag) || /^[WL]\d+$/.test(bortalag)) return null

      // Hitta resultat från Resultat-arket (kolumn B/C/D)
      const resRad = resultatRader?.find((r) => r[0] === matchId)
      if (!resRad) return null

      let vinnare
      if (resRad[3] === 'H') vinnare = hemmalag
      else if (resRad[3] === 'A') vinnare = bortalag
      else {
        // Fallback: bestäm från mål (gäller när vinnare-kolumn (D) saknas eller matchen
        // avgjordes inom 90/120 min utan straffar)
        const h = parseInt(resRad[1])
        const b = parseInt(resRad[2])
        if (isNaN(h) || isNaN(b) || h === b) return null   // oavgjort → okänd vinnare
        vinnare = h > b ? hemmalag : bortalag
      }

      if (typ === 'W') return vinnare
      // 'L' = förloraren (används för 3:e-platsmatch)
      return vinnare === hemmalag ? bortalag : hemmalag
    }

    return null
  }

  // ── Steg 5: Bygg resultatformat ────────────────────────────────────────────
  // Partiella fixtures tillåts: om bara ett lag är känt inkluderas ändå posten.
  // uppdateraKnockoutLagnamn() hanterar kolumnvis skrivning och skyddar befintliga
  // riktiga lagnamn från att skrivas över med null/platshållare.
  const SLUTSPELS_OMGÅNGAR_OF = new Set([
    'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final',
    'Match for third place', 'Final',
  ])
  const resultat = []
  for (const m of allaMatcher) {
    if (!SLUTSPELS_OMGÅNGAR_OF.has(m.round) || !m.num) continue
    const rå1 = lös(m.team1)
    const rå2 = lös(m.team2)
    const hemmalag = rå1 ? (LAGNAMN_MAP[rå1] || rå1) : null
    const bortalag = rå2 ? (LAGNAMN_MAP[rå2] || rå2) : null
    if (!hemmalag && !bortalag) continue   // båda okända — inget att uppdatera
    const match_id = `match_${String(m.num).padStart(3, '0')}`
    resultat.push({ match_id, hemmalag, bortalag, källa: 'openfootball' })
  }

  const båda  = resultat.filter((r) => r.hemmalag && r.bortalag).length
  const delar = resultat.filter((r) => !r.hemmalag || !r.bortalag).length
  console.log(`[resultsSource] getAllKnockoutFixtures: ${båda} kompletta + ${delar} partiella fixtures`)
  return resultat
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

  return väljLive(fd, tsdb)
}

/**
 * Väljer pågående matcher ur data från football-data.org (fd) och TheSportsDB (tsdb).
 *
 * Designprincip: football-data.org är auktoritativ för ställning och status.
 * TheSportsDB berikar med minuten. Detta undviker att ett annullerat mål (VAR)
 * som TSDB ännu inte plockat bort "vinner" över den korrekta ställningen från FD.
 *
 * En match räknas som AVSLUTAD så fort NÅGON källa säger FINISHED — den visas
 * aldrig som live, även om en långsammare källa fortfarande rapporterar IN_PLAY.
 *
 * Prioritet när FD saknar en match: TSDB används som fallback.
 */
export function väljLive(fd = [], tsdb = []) {
  const alla = [...fd, ...tsdb]

  // Bygg uppslagstabell för TSDB-poster (för minutberikelse)
  const tsdbMap = new Map()
  for (const m of tsdb) {
    tsdbMap.set(matchKey(m.hemmalag, m.bortalag), m)
  }

  // Matcher som NÅGON källa anser avslutade → aldrig live
  const avslutadeNycklar = new Set(
    alla.filter((m) => m.status === 'FINISHED').map((m) => matchKey(m.hemmalag, m.bortalag)),
  )

  // FD-poster som är IN_PLAY/PAUSED och inte avslutade enligt någon källa
  const fdLive = fd.filter(
    (m) => (m.status === 'IN_PLAY' || m.status === 'PAUSED') &&
           !avslutadeNycklar.has(matchKey(m.hemmalag, m.bortalag)),
  )

  // Berika FD-poster med minut från TSDB om tillgängligt
  const fdBerikade = fdLive.map((m) => {
    const tsdbPost = tsdbMap.get(matchKey(m.hemmalag, m.bortalag))
    return (tsdbPost?.minut != null && m.minut == null)
      ? { ...m, minut: tsdbPost.minut }
      : m
  })

  // Bygg resultatmap med FD som grund
  const map = new Map()
  for (const m of fdBerikade) {
    map.set(matchKey(m.hemmalag, m.bortalag), m)
  }

  // Fallback: TSDB-poster för matcher FD inte rapporterar alls
  for (const m of tsdb) {
    const key = matchKey(m.hemmalag, m.bortalag)
    if (!map.has(key) && !avslutadeNycklar.has(key) &&
        (m.status === 'IN_PLAY' || m.status === 'PAUSED')) {
      map.set(key, m)
    }
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
