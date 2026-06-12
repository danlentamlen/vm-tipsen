/**
 * tests/unit/resultsSource.test.js
 *
 * Tester för de rena delarna av resultatkällan: normalisering av lagnamn och
 * sammanslagning av flera källor (mergeResults). Nätverksanropen testas inte
 * här (de är inkapslade i try/catch och opt-in).
 */
import { describe, it, expect } from 'vitest'
import { norm, matchKey, mergeResults } from '../../Netlify/functions/_resultsSource.js'

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
