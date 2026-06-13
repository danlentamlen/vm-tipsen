/**
 * tests/unit/fifaMatchUrl.test.js
 *
 * Tester för fifaMatchUrl() — bygger länk till FIFA:s match-center scopat till
 * matchens dag. Vi har inte FIFA:s interna match-ID, så länken bygger på
 * ?date=YYYY-MM-DD (samma datumparameter FIFA:s match-center använder).
 */
import { describe, it, expect } from 'vitest'
import { fifaMatchUrl } from '../../src/components/MatchKort.jsx'

const BAS = 'https://www.fifa.com/en/match-centre'

describe('fifaMatchUrl', () => {
  it('lägger matchens datum som ?date-parameter', () => {
    expect(fifaMatchUrl({ datum: '2026-06-13', hemmalag: 'USA', bortalag: 'Paraguay' }))
      .toBe(`${BAS}?date=2026-06-13`)
  })

  it('plockar ut datumdelen även om datum har klockslag/extra', () => {
    expect(fifaMatchUrl({ datum: '2026-07-19T20:00:00Z' }))
      .toBe(`${BAS}?date=2026-07-19`)
  })

  it('faller tillbaka till match-centret utan datum när datum saknas/ogiltigt', () => {
    expect(fifaMatchUrl({ hemmalag: 'Sweden', bortalag: 'Brazil' })).toBe(BAS)
    expect(fifaMatchUrl({ datum: '' })).toBe(BAS)
    expect(fifaMatchUrl(null)).toBe(BAS)
    expect(fifaMatchUrl({ datum: 'okänt' })).toBe(BAS)
  })
})
