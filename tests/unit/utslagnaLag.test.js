/**
 * tests/unit/utslagnaLag.test.js
 *
 * Tester för byggUtslagnaLag() — härledning av utslagna lag ur Matcher +
 * Resultat — samt att byggBettingöversikt markerar svaren som `uträknad` på
 * lagfrågor (typ "team") och via manuella fel_svar (Frågor kolumn H).
 * Även parseSnabbasteMål() (Inställningar → minuter).
 */
import { describe, it, expect } from 'vitest'
import { byggUtslagnaLag, byggBettingöversikt, parseSnabbasteMål } from '../../netlify/functions/_scoring.js'

// Matcher: A=match_id,B=datum,C=tid,D=hemma,E=borta,F=grupp,G=omgång
const grupp = [
  ['m1', '2026-06-13', '18:00 UTC-4', 'USA',     'Paraguay', 'A', ''],
  ['m2', '2026-06-14', '21:00 UTC-4', 'Sweden',  'Brazil',   'B', ''],
  ['m3', '2026-06-15', '21:00 UTC-4', 'France',  'Spain',    'C', ''],
  ['m4', '2026-06-16', '21:00 UTC-4', 'Germany', 'Japan',    'D', ''],
]

describe('byggUtslagnaLag — gruppspel', () => {
  it('markerar ingen innan Round of 32 är fullt populerat', () => {
    const matcher = [
      ...grupp,
      ['ko1', '2026-06-28', '18:00 UTC-4', 'USA', 'Brazil', 'Slutspel', 'Round of 32'],
      ['ko2', '2026-06-29', '18:00 UTC-4', '1C',  '2D',     'Slutspel', 'Round of 32'], // platshållare kvar
    ]
    expect(byggUtslagnaLag(matcher, []).size).toBe(0)
  })

  it('slår ut gruppspelslag som saknas i fullt populerat Round of 32', () => {
    const matcher = [
      ...grupp,
      ['ko1', '2026-06-28', '18:00 UTC-4', 'USA',    'Brazil', 'Slutspel', 'Round of 32'],
      ['ko2', '2026-06-29', '18:00 UTC-4', 'France', 'Japan',  'Slutspel', 'Round of 32'],
    ]
    const ut = byggUtslagnaLag(matcher, [])
    expect(ut.has('paraguay')).toBe(true)
    expect(ut.has('sweden')).toBe(true)
    expect(ut.has('spain')).toBe(true)
    expect(ut.has('germany')).toBe(true)
    // Lagen i R32 lever tills deras match är avgjord
    expect(ut.has('usa')).toBe(false)
    expect(ut.has('brazil')).toBe(false)
  })
})

describe('byggUtslagnaLag — slutspel', () => {
  const r32 = [
    ['ko1', '2026-06-28', '18:00 UTC-4', 'USA',    'Brazil', 'Slutspel', 'Round of 32'],
    ['ko2', '2026-06-29', '18:00 UTC-4', 'France', 'Japan',  'Slutspel', 'Round of 32'],
  ]

  it('slår ut laget som förlorade på ordinarie tid', () => {
    const ut = byggUtslagnaLag(r32, [['ko1', '2', '0']])
    expect(ut.has('brazil')).toBe(true)
    expect(ut.has('usa')).toBe(false)
  })

  it('markerar ingen vid oavgjort (straffar) tills nästa omgång fyllts', () => {
    // 1-1 efter 90 min → avgjort på straffar, men R16 ej populerad än
    const ut = byggUtslagnaLag(r32, [['ko1', '1', '1']])
    expect(ut.has('usa')).toBe(false)
    expect(ut.has('brazil')).toBe(false)
  })

  it('slår ut straff-förloraren när vinnaren dykt upp i nästa omgång', () => {
    const matcher = [
      ...r32,
      ['ko3', '2026-07-04', '18:00 UTC-4', 'USA', 'France', 'Slutspel', 'Round of 16'],
    ]
    // ko1 1-1 (USA vann straffar → står i R16), ko2 1-0 (France vann)
    const ut = byggUtslagnaLag(matcher, [['ko1', '1', '1'], ['ko2', '1', '0']])
    expect(ut.has('brazil')).toBe(true)  // straff-förlorare, USA gick vidare
    expect(ut.has('japan')).toBe(true)   // förlust på 90 min
    expect(ut.has('usa')).toBe(false)
    expect(ut.has('france')).toBe(false)
  })

  it('räknar lag i bronsmatchen som utslagna', () => {
    const matcher = [
      ['sf1', '2026-07-14', '21:00 UTC-4', 'Spain',  'France',  'Slutspel', 'Semi-final'],
      ['sf2', '2026-07-15', '21:00 UTC-4', 'England','Germany', 'Slutspel', 'Semi-final'],
      ['brons', '2026-07-18', '18:00 UTC-4', 'France', 'Germany', 'Slutspel', 'Match for third place'],
      ['final', '2026-07-19', '18:00 UTC-4', 'Spain',  'England', 'Slutspel', 'Final'],
    ]
    const ut = byggUtslagnaLag(matcher, [])
    expect(ut.has('france')).toBe(true)
    expect(ut.has('germany')).toBe(true)
    expect(ut.has('spain')).toBe(false)
    expect(ut.has('england')).toBe(false)
  })
})

describe('byggBettingöversikt — uträknade svar', () => {
  const matcherRader = [
    ...grupp,
    ['ko1', '2026-06-28', '18:00 UTC-4', 'USA',    'Brazil', 'Slutspel', 'Round of 32'],
    ['ko2', '2026-06-29', '18:00 UTC-4', 'France', 'Japan',  'Slutspel', 'Round of 32'],
  ]
  // Frågor: A=id,B=fråga,C=poäng,D=typ,E=rätt_svar,F=fråga_en,G=typ_en,H=fel_svar
  const frågorRader = [
    ['q1', 'Vem vinner VM?', '12', 'team', '', 'Who wins?', '', ''],
    ['q2', 'Skyttekung?',    '5',  'text', '', 'Top scorer?', '', 'Ronaldo; Messi'],
  ]
  const frågorSvarRader = [
    ['s1', 'u1', 'q1', 'Sweden'],  // utslagen (ej i R32)
    ['s2', 'u2', 'q1', 'USA'],     // kvar
    ['s3', 'u1', 'q2', 'Ronaldo'], // manuellt fel-markerad
    ['s4', 'u2', 'q2', 'Haaland'], // kvar
  ]

  const res = byggBettingöversikt({ matcherRader, resultatRader: [], tipsRader: [], frågorRader, frågorSvarRader })

  it('markerar utslagna lag som uträknade på lagfrågor', () => {
    const q1 = res.frågor.find((f) => f.fråga_id === 'q1')
    expect(q1.fördelning.find((d) => d.svar === 'Sweden').uträknad).toBe(true)
    expect(q1.fördelning.find((d) => d.svar === 'USA').uträknad).toBe(false)
  })

  it('markerar manuella fel_svar (kolumn H) som uträknade, skiftlägesokänsligt', () => {
    const q2 = res.frågor.find((f) => f.fråga_id === 'q2')
    expect(q2.fördelning.find((d) => d.svar === 'Ronaldo').uträknad).toBe(true)
    expect(q2.fördelning.find((d) => d.svar === 'Haaland').uträknad).toBe(false)
  })

  it('markerar aldrig ett facit-rätt svar som uträknat', () => {
    const medFacit = byggBettingöversikt({
      matcherRader, resultatRader: [], tipsRader: [],
      frågorRader: [['q3', 'Vem vinner VM?', '12', 'team', 'Sweden', '', '', 'Sweden']],
      frågorSvarRader: [['s5', 'u1', 'q3', 'Sweden']],
    })
    const rad = medFacit.frågor[0].fördelning[0]
    expect(rad.rätt).toBe(true)
    expect(rad.uträknad).toBe(false)
  })
})

describe('parseSnabbasteMål', () => {
  it('tolkar heltal, decimaler och min:sek', () => {
    expect(parseSnabbasteMål('2')).toBe(2)
    expect(parseSnabbasteMål('1,5')).toBe(1.5)
    expect(parseSnabbasteMål('1:30')).toBe(1.5)
    expect(parseSnabbasteMål('0:47')).toBeCloseTo(47 / 60)
  })

  it('ger null för tomt/ogiltigt', () => {
    expect(parseSnabbasteMål('')).toBeNull()
    expect(parseSnabbasteMål(undefined)).toBeNull()
    expect(parseSnabbasteMål('abc')).toBeNull()
  })
})
