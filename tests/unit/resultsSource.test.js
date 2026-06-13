/**
 * tests/unit/resultsSource.test.js
 *
 * Tester för de rena delarna av resultatkällan: normalisering av lagnamn och
 * sammanslagning av flera källor (mergeResults). Nätverksanropen testas inte
 * här (de är inkapslade i try/catch och opt-in).
 */
import { describe, it, expect } from 'vitest'
import { norm, matchKey, mergeResults, mappaAvslutadeTillMatchId, väljLive, filtreraEjLive } from '../../Netlify/functions/_resultsSource.js'

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
    expect(rader).toEqual([['match_019', '2', '1']]) // United States → USA via LAGNAMN_MAP
    expect(omatchade).toHaveLength(0)
  })

  it('matchar i omvänd ordning och BYTER målen till arkets hemma/borta', () => {
    // Källan listar Paraguay hemma, men arket har USA hemma → mål måste byta plats
    const { rader } = mappaAvslutadeTillMatchId(
      [{ hemmalag: 'Paraguay', bortalag: 'USA', hemma: 1, borta: 2, status: 'FINISHED' }],
      matcher,
    )
    expect(rader).toEqual([['match_019', '2', '1']]) // 2 = USA:s mål i hemmakolumnen
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
    const live = väljLive([
      { hemmalag: 'USA', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'IN_PLAY', minut: 89, källa: 'football-data' },
      { hemmalag: 'USA', bortalag: 'Paraguay', hemma: 2, borta: 1, status: 'FINISHED', källa: 'balldontlie' },
    ])
    expect(live).toHaveLength(0) // matchen är slut → inte live
  })

  it('behåller match som faktiskt pågår och väljer färskaste posten', () => {
    const live = väljLive([
      { hemmalag: 'Brazil', bortalag: 'Morocco', hemma: 0, borta: 0, status: 'IN_PLAY', minut: 5 },
      { hemmalag: 'Brazil', bortalag: 'Morocco', hemma: 0, borta: 1, status: 'IN_PLAY', minut: 40 },
    ])
    expect(live).toHaveLength(1)
    expect(live[0].borta).toBe(1) // färskaste (flest mål/minut)
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
