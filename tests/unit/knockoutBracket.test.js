/**
 * tests/unit/knockoutBracket.test.js
 *
 * Tester för bracket-strukturen: finalen plockas rätt, bronsmatchen behålls
 * (även om den inte ingår i ROUND_ORDER), och platshållar-detektionen.
 */
import { describe, it, expect } from 'vitest'
import { buildBracket, ärRiktigtLag } from '../../src/components/KnockoutBracket'

// Minimal slutspelsuppsättning: 2 semifinaler, final, bronsmatch.
const matcher = [
  { match_id: '101', grupp: 'Slutspel', omgång: 'Semi-final', hemmalag: 'France', bortalag: 'Spain' },
  { match_id: '102', grupp: 'Slutspel', omgång: 'Semi-final', hemmalag: 'England', bortalag: 'Argentina' },
  { match_id: '103', grupp: 'Slutspel', omgång: 'Match for third place', hemmalag: 'France', bortalag: 'England' },
  { match_id: '104', grupp: 'Slutspel', omgång: 'Final', hemmalag: 'Spain', bortalag: 'Argentina' },
]

describe('buildBracket', () => {
  it('plockar finalen (högsta match_id i Final-omgången)', () => {
    const { left } = buildBracket(matcher)
    expect(left['Final']).toHaveLength(1)
    expect(left['Final'][0].match_id).toBe('104')
  })

  it('behåller bronsmatchen i byRound trots att den saknas i ROUND_ORDER', () => {
    const { byRound } = buildBracket(matcher)
    expect(byRound['Match for third place']).toBeDefined()
    expect(byRound['Match for third place']).toHaveLength(1)
    expect(byRound['Match for third place'][0].match_id).toBe('103')
  })

  it('placerar semifinalerna på var sin sida', () => {
    const { left, right } = buildBracket(matcher)
    expect(left['Semi-final']?.[0]?.match_id).toBe('101')
    expect(right['Semi-final']?.[0]?.match_id).toBe('102')
  })

  it('exkluderar bronsmatchen från Final-slotten', () => {
    const { left } = buildBracket(matcher)
    expect(left['Final'].some((m) => m.omgång === 'Match for third place')).toBe(false)
  })
})

describe('ärRiktigtLag', () => {
  it('accepterar riktiga lagnamn', () => {
    expect(ärRiktigtLag('Spain')).toBe(true)
    expect(ärRiktigtLag('Argentina')).toBe(true)
  })
  it('avvisar platshållare och koder', () => {
    expect(ärRiktigtLag('')).toBe(false)
    expect(ärRiktigtLag(null)).toBe(false)
    expect(ärRiktigtLag('Vinnare semifinal 1')).toBe(false)
    expect(ärRiktigtLag('Winner match 101')).toBe(false)
    expect(ärRiktigtLag('W101')).toBe(false)
    expect(ärRiktigtLag('L102')).toBe(false)
    expect(ärRiktigtLag('1A')).toBe(false)
    expect(ärRiktigtLag('3E')).toBe(false)
  })
})
