/**
 * tests/unit/totalMal.test.js
 *
 * Tester för mål-trackerns räknelogik (startsidans "Mål totalt").
 *
 * Princip: ENBART ordinarie tid (90 min) — inkl. straffar i spel, men exkl.
 * förlängning och straffläggning. Speglar Resultat-arket och poängräkningen.
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

  it('REGULAR med straffmål i spel: räknas med (de ligger i 90-min-resultatet)', () => {
    // Bronsmatch France 4-6 England där målen gjordes på straff UNDER matchen
    // (i spel, ej shootout) → duration REGULAR, fullTime 4-6 → alla 10 räknas.
    expect(målIMatch(match({
      duration: 'REGULAR', fullTime: { home: 4, away: 6 },
    }))).toBe(10)
  })

  it('regularTime prioriteras (90-min) framför fullTime vid förlängning', () => {
    // Match 82: 2-2 efter ordinarie, 3-2 efter förlängning → räknas som 4 (2+2).
    expect(målIMatch(match({
      duration: 'EXTRA_TIME',
      fullTime:    { home: 3, away: 2 },
      regularTime: { home: 2, away: 2 },
      extraTime:   { home: 1, away: 0 },
    }))).toBe(4)
  })

  it('EXTRA_TIME utan regularTime: subtraherar förlängningsmål', () => {
    // 0-0 efter 90, 1-0 efter förlängning → 90-min = 0 mål.
    expect(målIMatch(match({
      duration: 'EXTRA_TIME',
      fullTime:  { home: 1, away: 0 },
      extraTime: { home: 1, away: 0 },
    }))).toBe(0)
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

  it('PENALTY_SHOOTOUT med ET-mål: både ET och shootout dras bort', () => {
    // 1-1 FT, 1-2 efter ET, hemmalag vinner 5-4 på straff.
    // fullTime {1+0+5, 1+1+4} = {6,6}, extraTime {0,1}, penalties {5,4}
    // 90-min = 1 + 1 = 2.
    expect(målIMatch(match({
      duration: 'PENALTY_SHOOTOUT',
      fullTime:  { home: 6, away: 6 },
      extraTime: { home: 0, away: 1 },
      penalties: { home: 5, away: 4 },
    }))).toBe(2) // (6-0-5) + (6-1-4)
  })

  it('regularTime med homeTeam/awayTeam-nycklar stöds', () => {
    expect(målIMatch(match({
      duration: 'PENALTY_SHOOTOUT',
      fullTime:    { home: 7, away: 6 },
      regularTime: { homeTeam: 1, awayTeam: 1 },
      penalties:   { home: 6, away: 5 },
    }))).toBe(2)
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
      match({ duration: 'EXTRA_TIME', fullTime: { home: 1, away: 0 }, extraTime: { home: 1, away: 0 } }), // 0 (ET-mål strippas)
      match({ duration: 'PENALTY_SHOOTOUT', fullTime: { home: 4, away: 5 }, extraTime: { home: 0, away: 0 }, penalties: { home: 3, away: 4 } }), // 2
    ]
    const r = räknaMål(matcher)
    expect(r.totalMål).toBe(4)
    expect(r.speladeMatcher).toBe(3)
    expect(r.snitMålPerMatch).toBe(1.3) // 4/3 = 1.333… → 1.3
  })

  it('tom lista ger nollor utan division med noll', () => {
    expect(räknaMål([])).toEqual({ totalMål: 0, speladeMatcher: 0, snitMålPerMatch: 0 })
  })
})
