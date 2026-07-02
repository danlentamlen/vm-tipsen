/**
 * tests/unit/resultsSource.test.js
 *
 * Tester för de rena delarna av resultatkällan: normalisering av lagnamn och
 * sammanslagning av flera källor (mergeResults). Nätverksanropen testas inte
 * här (de är inkapslade i try/catch och opt-in).
 */
import { describe, it, expect } from 'vitest'
import { norm, matchKey, mergeResults, mappaAvslutadeTillMatchId, väljLive, filtreraEjLive, tsdbV1Normalize, tsdbV2Normalize, fdNormalize } from '../../Netlify/functions/_resultsSource.js'

describe('norm', () => {
  it('mappar avvikande lagnamn och normaliserar till gemener', () => {
    expect(norm('United States')).toBe('usa')
    expect(norm('Korea Republic')).toBe('south korea')
    expect(norm('  Sweden ')).toBe('sweden')
  })
})

describe('matchKey', () => {
  it('bygger en källoberoende nyckel', () => {
    expect(matchKey('United States', 'Türkiye')).toBe('usa_turkey')
  })
})

describe('mergeResults', () => {
  const sched = { hemmalag: 'Sweden', bortalag: 'Brazil', hemma: null, borta: null, status: 'SCHEDULED', källa: 'a' }
  const live  = { hemmalag: 'Sweden', bortalag: 'Brazil', hemma: 1, borta: 0, status: 'IN_PLAY', källa: 'b' }
  const fin   = { hemmalag: 'Sweden', bortalag: 'Brazil', hemma: 2, borta: 1, status: 'FINISHED', källa: 'c' }

  it('väljer starkaste status per match (FINISHED > IN_PLAY > SCHEDULED)', () => {
    const merged = mergeResults([sched], [live], [fin])
    expect(merged).toHaveLength(1)
    expect(merged[0].status).toBe('FINISHED')
    expect(merged[0].hemma).toBe(2)
  })

  it('behåller live om inget avslutat finns', () => {
    const merged = mergeResults([sched], [live])
    expect(merged[0].status).toBe('IN_PLAY')
    expect(merged[0].källa).toBe('b')
  })

  it('slår ihop olika matcher och ignorerar poster utan lagnamn', () => {
    const merged = mergeResults(
      [fin],
      [{ hemmalag: 'France', bortalag: 'Spain', status: 'IN_PLAY' }],
      [{ hemmalag: '', bortalag: 'X', status: 'FINISHED' }],
    )
    expect(merged).toHaveLength(2)
  })
})

describe('mappaAvslutadeTillMatchId', () => {
  // Matcher-arket: A=match_id, B=datum, C=tid, D=team1, E=team2
  const matcher = [
    ['match_019', '2026-06-12', '18:00 UTC-7', 'USA', 'Paraguay'],
    ['match_007', '2026-06-12', '15:00 UTC-4', 'Canada', 'UEFA Path A winner'], // platshållare
  ]

  it('matchar i exakt ordning och behåller målen', () => {
    const { rader, omatchade } = mappaAvslutadeTillMatchId(
      [{ hemmalag: 'United States', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'FINISHED' }],
      matcher,
    )
    // Kolumn D = vinnare ('' för gruppspelsmatcher utan vinnare-info)
    expect(rader).toEqual([['match_019', '2', '1', '']]) // United States → USA via LAGNAMN_MAP
    expect(omatchade).toHaveLength(0)
  })

  it('matchar i omvänd ordning och BYTER målen till arkets hemma/borta', () => {
    // Källan listar Paraguay hemma, men arket har USA hemma → mål måste byta plats
    const { rader } = mappaAvslutadeTillMatchId(
      [{ hemmalag: 'Paraguay', bortalag: 'USA', hemma: 1, borta: 2, status: 'FINISHED' }],
      matcher,
    )
    expect(rader).toEqual([['match_019', '2', '1', '']]) // 2 = USA:s mål i hemmakolumnen
  })

  it('lägger platshållarmatch i omatchade (skrivs ej)', () => {
    const { rader, omatchade } = mappaAvslutadeTillMatchId(
      [{ hemmalag: 'Canada', bortalag: 'Italy', hemma: 0, borta: 1, status: 'FINISHED', källa: 'football-data' }],
      matcher,
    )
    expect(rader).toHaveLength(0)
    expect(omatchade).toHaveLength(1)
    expect(omatchade[0].bortalag).toBe('Italy')
  })

  it('ignorerar resultat utan kända mål', () => {
    const { rader } = mappaAvslutadeTillMatchId(
      [{ hemmalag: 'USA', bortalag: 'Paraguay', hemma: null, borta: null, status: 'FINISHED' }],
      matcher,
    )
    expect(rader).toHaveLength(0)
  })
})

describe('väljLive', () => {
  it('utesluter match som NÅGON källa markerat FINISHED (eftersläpande IN_PLAY vinner ej)', () => {
    const fd   = [{ hemmalag: 'USA', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'IN_PLAY', minut: 89, källa: 'football-data' }]
    const tsdb = [{ hemmalag: 'USA', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'FINISHED', källa: 'thesportsdb-v2' }]
    expect(väljLive(fd, tsdb)).toHaveLength(0) // matchen är slut → inte live
  })

  it('FD är auktoritativ för ställning — annullerat mål (VAR) fixas korrekt', () => {
    // FD har uppdaterat till 0-0 men TSDB visar fortfarande 0-1
    const fd   = [{ hemmalag: 'Belgium', bortalag: 'Iran', hemma: 0, borta: 0, status: 'IN_PLAY', minut: null, källa: 'football-data' }]
    const tsdb = [{ hemmalag: 'Belgium', bortalag: 'Iran', hemma: 0, borta: 1, status: 'IN_PLAY', minut: 34, källa: 'thesportsdb-v2' }]
    const live = väljLive(fd, tsdb)
    expect(live).toHaveLength(1)
    expect(live[0].hemma).toBe(0)
    expect(live[0].borta).toBe(0)  // FD vinner, inte TSDB:s felaktiga 1
  })

  it('berikar FD-post med minut från TSDB när FD saknar minut', () => {
    const fd   = [{ hemmalag: 'Belgium', bortalag: 'Iran', hemma: 1, borta: 0, status: 'IN_PLAY', minut: null, källa: 'football-data' }]
    const tsdb = [{ hemmalag: 'Belgium', bortalag: 'Iran', hemma: 1, borta: 0, status: 'IN_PLAY', minut: 67, källa: 'thesportsdb-v2' }]
    const live = väljLive(fd, tsdb)
    expect(live[0].minut).toBe(67)  // berikat från TSDB
    expect(live[0].hemma).toBe(1)   // FD:s ställning behålls
  })

  it('faller tillbaka på TSDB om FD inte rapporterar matchen alls', () => {
    const fd   = []
    const tsdb = [{ hemmalag: 'Brazil', bortalag: 'Morocco', hemma: 0, borta: 1, status: 'IN_PLAY', minut: 40, källa: 'thesportsdb-v2' }]
    const live = väljLive(fd, tsdb)
    expect(live).toHaveLength(1)
    expect(live[0].borta).toBe(1)
  })

  it('FD IN_PLAY + TSDB FINISHED → matchen utesluts', () => {
    const fd   = [{ hemmalag: 'Spain', bortalag: 'Morocco', hemma: 2, borta: 0, status: 'IN_PLAY', minut: 92, källa: 'football-data' }]
    const tsdb = [{ hemmalag: 'Spain', bortalag: 'Morocco', hemma: 2, borta: 0, status: 'FINISHED', källa: 'thesportsdb-v2' }]
    expect(väljLive(fd, tsdb)).toHaveLength(0)
  })
})

describe('tsdbV1Normalize — AET/PEN-fall', () => {
  it('FT-match: ger fullständig ställning som-är', () => {
    const ev = {
      strHomeTeam: 'Brazil', strAwayTeam: 'Japan',
      intHomeScore: '2', intAwayScore: '1',
      strStatus: 'FT', strProgress: null,
    }
    const r = tsdbV1Normalize(ev)
    expect(r.hemma).toBe(2)
    expect(r.borta).toBe(1)
    expect(r.vinnare).toBe('')
    expect(r.status).toBe('FINISHED')
  })

  it('PEN-match utan förlängningsmål: 90-min-resultatet bevaras och vinnare sätts från straffar', () => {
    // Germany 1-1 Paraguay efter 90 min, inga ET-mål, Paraguay vinner 4-3 på straffar
    // TSDB rapporterar intHomeScore=4 (1 FT-mål + 3 straffmål), intAwayScore=5 (1+4)
    const ev = {
      strHomeTeam: 'Germany', strAwayTeam: 'Paraguay',
      intHomeScore: '4', intAwayScore: '5',   // kumulativt: 1 FT + 3 resp 4 straffmål
      intHomeExtraTime: '0', intAwayExtraTime: '0',
      intHomePenaltyScore: '3', intAwayPenaltyScore: '4',
      strStatus: 'PEN', strProgress: null,
    }
    const r = tsdbV1Normalize(ev)
    expect(r.hemma).toBe(1)    // 1 − 0 = 1 (korrekt 90-min)
    expect(r.borta).toBe(1)    // 1 − 0 = 1 (korrekt 90-min)
    expect(r.vinnare).toBe('A') // Paraguay vann på straff
    expect(r.status).toBe('FINISHED')
  })

  it('AET-match med förlängningsmål: subtraherar ET-mål för 90-min-resultatet', () => {
    // 0-0 efter 90 min, hemmalag gör mål i förlängning → 1-0 efter 120 min
    const ev = {
      strHomeTeam: 'Netherlands', strAwayTeam: 'Morocco',
      intHomeScore: '1', intAwayScore: '0',   // totalt inkl. ET
      intHomeExtraTime: '1', intAwayExtraTime: '0', // mål gjorda ENBART i ET
      strStatus: 'AET', strProgress: null,
    }
    const r = tsdbV1Normalize(ev)
    expect(r.hemma).toBe(0)    // 1 − 1 = 0 (90-min-resultatet)
    expect(r.borta).toBe(0)    // 0 − 0 = 0
    expect(r.vinnare).toBe('H') // Hemmalag vann i förlängning (totalt 1-0)
    expect(r.status).toBe('FINISHED')
  })

  it('PEN-match med förlängningsmål: subtraherar ET-mål och vinnare från straffar', () => {
    // 1-1 efter 90 min, bortalag gör mål i ET → 1-2 efter 120 min
    // sedan hemmalag vinner 5-4 på straff
    // TSDB: intHomeScore = 1 (FT) + 0 (ET) + 5 (pens) = 6, intAwayScore = 1+1+4 = 6
    const ev = {
      strHomeTeam: 'France', strAwayTeam: 'Argentina',
      intHomeScore: '6', intAwayScore: '6',    // kumulativt: FT + ET + straffmål
      intHomeExtraTime: '0', intAwayExtraTime: '1', // mål i ET
      intHomePenaltyScore: '5', intAwayPenaltyScore: '4',
      strStatus: 'PEN', strProgress: null,
    }
    const r = tsdbV1Normalize(ev)
    expect(r.hemma).toBe(1)    // 1 − 0 = 1 (90-min)
    expect(r.borta).toBe(1)    // 2 − 1 = 1 (90-min)
    expect(r.vinnare).toBe('H') // France vann på straff
  })
})

describe('tsdbV2Normalize — AET/PEN-fall', () => {
  it('PEN-match utan förlängningsmål: 90-min-resultatet bevaras', () => {
    // TSDB: intHomeScore = 1 + 2 pens = 3, intAwayScore = 1 + 3 pens = 4
    const ev = {
      strHomeTeam: 'Netherlands', strAwayTeam: 'Morocco',
      intHomeScore: '3', intAwayScore: '4',   // kumulativt inkl. straffmål
      intHomeExtraTime: '0', intAwayExtraTime: '0',
      intHomePenaltyScore: '2', intAwayPenaltyScore: '3',
      strStatus: 'PEN', strProgress: null,
    }
    const r = tsdbV2Normalize(ev)
    expect(r.hemma).toBe(1)
    expect(r.borta).toBe(1)
    expect(r.vinnare).toBe('A')
    expect(r.status).toBe('FINISHED')
  })
})

describe('fdNormalize — AET/PEN-fall', () => {
  // Bekräftat med rå FD-data 2026-06-30:
  // score.fullTime är KUMULATIVT (FT-mål + ET-mål + straffmål).
  // score.extraTime = enbart ET-mål, score.penalties = enbart straffmål.

  const makeMatch = (overrides) => ({
    homeTeam: { name: 'Germany' },
    awayTeam: { name: 'Paraguay' },
    status: 'FINISHED',
    minute: null,
    score: {
      duration: 'REGULAR_TIME',
      winner: null,
      fullTime: { home: 2, away: 1 },
      extraTime: { home: null, away: null },
      penalties: { home: null, away: null },
      ...overrides,
    },
  })

  it('REGULAR_TIME: fullTime bevaras as-is', () => {
    const r = fdNormalize(makeMatch())
    expect(r.hemma).toBe(2)
    expect(r.borta).toBe(1)
    expect(r.vinnare).toBeNull()
  })

  it('PENALTY_SHOOTOUT utan ET-mål: subtraherar straffmål från fullTime', () => {
    // Germany 1-1 Paraguay → straffar 3-4. FD: fullTime={4,5}, penalties={3,4}
    const r = fdNormalize(makeMatch({
      duration: 'PENALTY_SHOOTOUT',
      winner: 'AWAY_TEAM',
      fullTime:   { home: 4, away: 5 },
      extraTime:  { home: 0, away: 0 },
      penalties:  { home: 3, away: 4 },
    }))
    expect(r.hemma).toBe(1)   // 4 - 0 - 3 = 1
    expect(r.borta).toBe(1)   // 5 - 0 - 4 = 1
    expect(r.vinnare).toBe('A')
  })

  it('PENALTY_SHOOTOUT med ET-mål: subtraherar både ET och straffmål', () => {
    // 1-1 FT, 0-1 i ET → 1-2 efter 120 min, hemmalag vinner 5-4 på straff
    // FD: fullTime={1+0+5, 1+1+4}={6,6}, extraTime={0,1}, penalties={5,4}
    const r = fdNormalize(makeMatch({
      duration: 'PENALTY_SHOOTOUT',
      winner: 'HOME_TEAM',
      fullTime:  { home: 6, away: 6 },
      extraTime: { home: 0, away: 1 },
      penalties: { home: 5, away: 4 },
    }))
    expect(r.hemma).toBe(1)   // 6 - 0 - 5 = 1
    expect(r.borta).toBe(1)   // 6 - 1 - 4 = 1
    expect(r.vinnare).toBe('H')
  })

  it('EXTRA_TIME: subtraherar ET-mål men ej straffmål', () => {
    // 0-0 FT, hemmalag gör mål i ET → 1-0 efter 120 min. FD: fullTime={1,0}, extraTime={1,0}
    const r = fdNormalize(makeMatch({
      duration: 'EXTRA_TIME',
      winner: 'HOME_TEAM',
      fullTime:  { home: 1, away: 0 },
      extraTime: { home: 1, away: 0 },
      penalties: { home: null, away: null },
    }))
    expect(r.hemma).toBe(0)   // 1 - 1 = 0
    expect(r.borta).toBe(0)   // 0 - 0 = 0
    expect(r.vinnare).toBe('H')
  })

  // score.regularTime (mål efter 90 min) är den officiella 90-min-poängen och
  // ska användas rakt av när den finns — oavsett fullTime/extraTime.
  it('EXTRA_TIME med regularTime: använder 90-min-resultatet (match 82: 2-2, ej 3-2)', () => {
    // Match 82: 2-2 efter ordinarie tid, 3-2 efter förlängning.
    const r = fdNormalize(makeMatch({
      duration: 'EXTRA_TIME',
      winner: 'HOME_TEAM',
      fullTime:    { home: 3, away: 2 },
      regularTime: { home: 2, away: 2 },
      extraTime:   { home: 1, away: 0 },
      penalties:   { home: null, away: null },
    }))
    expect(r.hemma).toBe(2)
    expect(r.borta).toBe(2)
    expect(r.vinnare).toBe('H') // bracket-propagering följer FD:s winner
  })

  it('regularTime prioriteras även om extraTime skulle saknas', () => {
    // Feed utan extraTime-uppdelning: enbart regularTime räddar 90-min-resultatet.
    const r = fdNormalize(makeMatch({
      duration: 'EXTRA_TIME',
      winner: 'AWAY_TEAM',
      fullTime:    { home: 1, away: 2 },
      regularTime: { home: 1, away: 1 },
      extraTime:   { home: null, away: null },
      penalties:   { home: null, away: null },
    }))
    expect(r.hemma).toBe(1)
    expect(r.borta).toBe(1)
  })

  it('regularTime med homeTeam/awayTeam-nycklar stöds', () => {
    const r = fdNormalize(makeMatch({
      duration: 'PENALTY_SHOOTOUT',
      winner: 'HOME_TEAM',
      fullTime:    { home: 7, away: 6 },
      regularTime: { homeTeam: 1, awayTeam: 1 },
      extraTime:   { home: 0, away: 0 },
      penalties:   { home: 6, away: 5 },
    }))
    expect(r.hemma).toBe(1)
    expect(r.borta).toBe(1)
    expect(r.vinnare).toBe('H')
  })
})

describe('filtreraEjLive', () => {
  const matcher = [['match_019', '2026-06-12', '18:00 UTC-7', 'USA', 'Paraguay']] // avspark 2026-06-13 01:00 UTC
  const live = [{ hemmalag: 'USA', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'IN_PLAY' }]

  it('släng match som varit "live" längre än maxgränsen efter avspark', () => {
    const now = new Date('2026-06-13T06:00:00Z') // 5 h efter avspark
    expect(filtreraEjLive(live, matcher, now, 3.5)).toHaveLength(0)
  })

  it('behåller match som ligger inom rimligt tidsfönster', () => {
    const now = new Date('2026-06-13T02:30:00Z') // 1,5 h efter avspark
    expect(filtreraEjLive(live, matcher, now, 3.5)).toHaveLength(1)
  })

  it('behåller match med okänd avspark (bryter ej nuvarande beteende)', () => {
    const now = new Date('2026-06-13T06:00:00Z')
    expect(filtreraEjLive(live, [], now, 3.5)).toHaveLength(1)
  })
})
