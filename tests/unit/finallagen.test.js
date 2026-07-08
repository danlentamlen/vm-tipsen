/**
 * tests/unit/finallagen.test.js
 *
 * Ren enhetstest för byggFinallagMap — klassificering av team-frågorna
 * (vinnare/förlorare) och per-användare-mappen. Inga Sheets-anrop.
 */
import { describe, it, expect } from 'vitest'
import { byggFinallagMap } from '../../Netlify/functions/finallagen.js'

// Frågor: A=id, B=fråga, C=poäng, D=typ
const FRAGOR = [
  ['q1', 'Vem vinner VM?',        '10', 'team'],
  ['q2', 'Vem förlorar finalen?', '5',  'team'],
  ['q3', 'Antal mål totalt?',     '3',  'number'],
]

// FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar
const SVAR = [
  ['s1', 'u1', 'q1', 'Spain'],
  ['s2', 'u1', 'q2', 'England'],
  ['s3', 'u2', 'q1', 'Brazil'],
  ['s4', 'u3', 'q2', 'France'],
  ['s5', 'u4', 'q3', '150'],
]

describe('byggFinallagMap', () => {
  it('mappar vinnare och förlorare per användare', () => {
    const map = byggFinallagMap(FRAGOR, SVAR)
    expect(map.u1).toEqual({ vinnare: 'Spain', förlorare: 'England', vinnareUt: false, förlorareUt: false })
    expect(map.u2).toEqual({ vinnare: 'Brazil', förlorare: null, vinnareUt: false, förlorareUt: false })
    expect(map.u3).toEqual({ vinnare: null, förlorare: 'France', vinnareUt: false, förlorareUt: false })
  })

  it('markerar utslagna lag (skiftlägesokänsligt)', () => {
    const utslagna = new Set(['england', 'brazil'])
    const map = byggFinallagMap(FRAGOR, SVAR, utslagna)
    expect(map.u1).toEqual({ vinnare: 'Spain', förlorare: 'England', vinnareUt: false, förlorareUt: true })
    expect(map.u2.vinnareUt).toBe(true)
    expect(map.u3.förlorareUt).toBe(false)
  })

  it('ignorerar icke-team-frågor', () => {
    const map = byggFinallagMap(FRAGOR, SVAR)
    expect(map.u4).toBeUndefined()
  })

  it('klassificerar via frågetext oavsett ordning i arket', () => {
    const frågor = [
      ['q2', 'Vem förlorar finalen?', '5',  'team'],
      ['q1', 'Vem vinner VM?',        '10', 'team'],
    ]
    const map = byggFinallagMap(frågor, SVAR)
    expect(map.u1.vinnare).toBe('Spain')
    expect(map.u1.förlorare).toBe('England')
  })

  it('faller tillbaka på ordning om texten inte matchar', () => {
    const frågor = [
      ['q1', 'Finallag A', '10', 'team'],
      ['q2', 'Finallag B', '5',  'team'],
    ]
    const map = byggFinallagMap(frågor, SVAR)
    expect(map.u1.vinnare).toBe('Spain')
    expect(map.u1.förlorare).toBe('England')
  })

  it('returnerar tom map utan team-frågor', () => {
    const map = byggFinallagMap([['q3', 'Antal mål?', '3', 'number']], SVAR)
    expect(map).toEqual({})
  })

  it('tål tomma indata', () => {
    expect(byggFinallagMap()).toEqual({})
  })
})
