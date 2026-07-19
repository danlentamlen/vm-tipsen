/**
 * tests/unit/totalMal.test.js
 *
 * Tester för mål-trackerns räknelogik (startsidans "Mål totalt").
 *
 * Princip (FIFA-officiellt): räkna ordinarie + förlängning + straffar i spel,
 * men EXKLUDERA straffläggning (shootout). Detta skiljer sig medvetet från
 * betting-/poänglogiken som bara använder 90-min-resultatet.
 */
import { describe, it, expect } from 'vitest'
import { målIMatch, räknaMål } from '../../Netlify/functions/total-mal.js'

const match = (score) => ({ score })

describe('målIMatch', () => {
  it('REGULAR: räknar fullTime as-is', () => {
    expect(målIMatch(match({
      duration: 'REGULAR', fullTime: { home: 5, away: 1 },
    }))).toBe(6)
  })

  it('REGULAR med straffmål i spel: räknas med (de ligger i fullTime)', () => {
    // Bronsmatch France 4-6 England där målen gjordes på straff UNDER matchen
    // (i spel, ej shootout) → duration REGULAR, fullTime 4-6 → alla 10 räknas.
    expect(målIMatch(match({
      duration: 'REGULAR', fullTime: { home: 4, away: 6 },
    }))).toBe(10)
  })

  it('EXTRA_TIME: förlängningsmål räknas som riktiga mål', () => {
    // 0-0 efter 90, 1-0 efter förlängning → 1 riktigt mål (ändring mot gammalt
    // beteende som strippade ET-målet och räknade 0).
    expect(målIMatch(match({
      duration: 'EXTRA_TIME',
      fullTime:  { home: 1, away: 0 },
      extraTime: { home: 1, away: 0 },
    }))).toBe(1)
  })

  it('PENALTY_SHOOTOUT utan ET-mål: shootout exkluderas, 90-min-mål behålls', () => {
    // Germany 1-1 Paraguay, straffar 3-4. fullTime kumulativt {4,5}, penalties {3,4}
    expect(målIMatch(match({
      duration: 'PENALTY_SHOOTOUT',
      fullTime:  { home: 4, away: 5 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 3, away: 4 },
    }))).toBe(2) // (4-3) + (5-4)
  })

  it('PENALTY_SHOOTOUT med ET-mål: ET behålls, endast shootout dras bort', () => {
    // 1-1 FT, 1-2 efter ET, hemmalag vinner 5-4 på straff.
    // fullTime {1+0+5, 1+1+4} = {6,6}, extraTime {0,1}, penalties {5,4}
    // Riktiga mål = ordinarie+ET = 1 + 2 = 3.
    expect(målIMatch(match({
      duration: 'PENALTY_SHOOTOUT',
      fullTime:  { home: 6, away: 6 },
      extraTime: { home: 0, away: 1 },
      penalties: { home: 5, away: 4 },
    }))).toBe(3) // (6-5) + (6-4)
  })

  it('saknad score hanterar utan krasch', () => {
    expect(målIMatch({})).toBe(0)
    expect(målIMatch({ score: { duration: 'REGULAR', fullTime: {} } })).toBe(0)
  })
})

describe('räknaMål', () => {
  it('summerar mål och matcher samt räknar snitt', () => {
    const matcher = [
      match({ duration: 'REGULAR', fullTime: { home: 2, away: 0 } }),          // 2
      match({ duration: 'EXTRA_TIME', fullTime: { home: 1, away: 0 }, extraTime: { home: 1, away: 0 } }), // 1
      match({ duration: 'PENALTY_SHOOTOUT', fullTime: { home: 4, away: 5 }, extraTime: { home: 0, away: 0 }, penalties: { home: 3, away: 4 } }), // 2
    ]
    const r = räknaMål(matcher)
    expect(r.totalMål).toBe(5)
    expect(r.speladeMatcher).toBe(3)
    expect(r.snitMålPerMatch).toBe(1.7) // 5/3 = 1.666… → 1.7
  })

  it('tom lista ger nollor utan division med noll', () => {
    expect(räknaMål([])).toEqual({ totalMål: 0, speladeMatcher: 0, snitMålPerMatch: 0 })
  })
})
