/**
 * tests/unit/distribution.test.js
 *
 * Tester för de rena aggregeringarna bakom "Vilka tippade"-modalen:
 * byggNamnMap, byggMatchFördelning och byggFrågeFördelning. Täcker namn-join,
 * sortering (antal fallande, sedan resultat), procent, samt att namnen
 * grupperas rätt per resultat.
 */
import { describe, it, expect } from 'vitest'
import {
  byggNamnMap,
  byggMatchFördelning,
  byggFrågeFördelning,
} from '../../netlify/functions/distribution.js'
import { dedupliceraTips } from '../../netlify/functions/_scoring.js'

const användare = [
  ['u1', 'Anna'],
  ['u2', 'Björn'],
  ['u3', 'Cecilia'],
  ['u4', 'David'],
]

describe('byggNamnMap', () => {
  it('mappar user_id → namn och faller tillbaka på "Okänd"', () => {
    const map = byggNamnMap([...användare, ['u5', '']])
    expect(map.u1).toBe('Anna')
    expect(map.u5).toBe('Okänd')
  })
})

describe('byggMatchFördelning', () => {
  // Tips: A=tip_id,B=user_id,C=match_id,D=hemma,E=borta
  const tips = [
    ['t1', 'u1', 'm1', '1', '1'],
    ['t2', 'u2', 'm1', '1', '1'],
    ['t3', 'u3', 'm1', '2', '0'],
  ]

  it('grupperar namn per resultat och räknar antal + procent', () => {
    const { totalt, fördelning } = byggMatchFördelning(tips, byggNamnMap(användare))
    expect(totalt).toBe(3)
    const ett = fördelning.find((r) => r.resultat === '1-1')
    expect(ett.antal).toBe(2)
    expect(ett.procent).toBe(67)
    expect(ett.namn).toEqual(['Anna', 'Björn']) // sorterat
  })

  it('sorterar populäraste resultat först', () => {
    const { fördelning } = byggMatchFördelning(tips, byggNamnMap(användare))
    expect(fördelning[0].resultat).toBe('1-1')
  })

  it('respekterar dedup: redigerat tip räknas bara en gång', () => {
    const medRedigering = [
      ...tips,
      ['t4', 'u1', 'm1', '3', '3'], // u1 ändrar sig → 1-1 ska tappa Anna
    ]
    const dedupat = dedupliceraTips(medRedigering).filter((r) => r[2] === 'm1')
    const { totalt, fördelning } = byggMatchFördelning(dedupat, byggNamnMap(användare))
    expect(totalt).toBe(3)
    const ett = fördelning.find((r) => r.resultat === '1-1')
    expect(ett.antal).toBe(1)
    expect(ett.namn).toEqual(['Björn'])
  })

  it('hanterar tomt underlag', () => {
    expect(byggMatchFördelning([], {})).toEqual({ totalt: 0, fördelning: [] })
  })
})

describe('byggFrågeFördelning', () => {
  // FrågorSvar: A=id,B=user_id,C=fråga_id,D=svar
  const svar = [
    ['s1', 'u1', 'f1', 'Brasilien'],
    ['s2', 'u2', 'f1', 'Brasilien'],
    ['s3', 'u3', 'f1', 'Argentina'],
    ['s4', 'u4', 'f1', ''], // tomt svar → "–"
  ]

  it('grupperar namn per svar', () => {
    const { totalt, fördelning } = byggFrågeFördelning(svar, byggNamnMap(användare))
    expect(totalt).toBe(4)
    const br = fördelning.find((r) => r.resultat === 'Brasilien')
    expect(br.namn).toEqual(['Anna', 'Björn'])
    expect(fördelning.find((r) => r.resultat === '–').namn).toEqual(['David'])
  })
})
