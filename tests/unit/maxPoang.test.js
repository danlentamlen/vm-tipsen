/**
 * tests/unit/maxPoang.test.js
 *
 * Tester för bedömFrågeSvar() / beräknaFrågeSvarPoäng() — bedömning av vilka
 * frågesvar som är rätta, fel, uträknade eller fortfarande öppna — samt
 * beräknaMaxPoäng() — teoretiskt maximal slutpoäng per användare.
 */
import { describe, it, expect } from 'vitest'
import {
  bedömFrågeSvar, beräknaFrågeSvarPoäng, beräknaMaxPoäng,
  ärMålFråga, ärSnabbastFråga,
} from '../../netlify/functions/_scoring.js'

// Frågor: A=id,B=fråga,C=poäng,D=typ,E=rätt_svar,F=fråga_en,G=typ_en,H=fel_svar
const frågor = [
  ['001', 'Vem vinner VM?',                 '10', 'team', '', 'Who wins?',              '', ''],
  ['002', 'Vem förlorar finalen?',           '5', 'team', '', 'Who loses the final?',   '', ''],
  ['005', 'Vem vinner skytteligan?',         '5', 'text', '', 'Top scorer?',            '', 'Mbappé; Kane'],
  ['007', 'Totalt antal mål i turneringen?', '5', 'text', '', 'Total goals?',           '', ''],
  ['008', 'När görs snabbaste målet?',       '5', 'text', '', 'Fastest goal (minute)?', '', ''],
  ['009', 'Vilken grupp tar flest poäng?',   '3', 'text', 'Grupp C', 'Best group?',     '', ''],
]

// Matcher + Resultat som gör Sweden utslaget: R32 fullt populerat utan Sweden.
// (Två R32-matcher med riktiga lag räcker för att r32Fullt ska vara sant.)
const matcher = [
  ['m1', '2026-06-13', '18:00 UTC-4', 'Sweden',  'Brazil',  'B', ''],
  ['m2', '2026-06-14', '18:00 UTC-4', 'France',  'Spain',   'C', ''],
  ['k1', '2026-06-29', '18:00 UTC-4', 'Brazil',  'France',  'Slutspel', 'Round of 32'],
  ['k2', '2026-06-30', '18:00 UTC-4', 'Spain',   'Germany', 'Slutspel', 'Round of 32'],
  ['k9', '2026-07-19', '15:00 UTC-4', 'W101',    'W102',    'Slutspel', 'Final'],
]
const resultat = [
  ['m1', '0', '2'],
  ['m2', '1', '1'],
]

// FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar
const svar = [
  ['s1', 'u1', '001', 'Sweden'],   // utslaget lag → uträknad
  ['s2', 'u1', '005', 'Mbappé'],   // fel-markerad i kolumn H → uträknad
  ['s3', 'u1', '007', '150'],      // under nuvarande totalMål (170) → uträknad
  ['s4', 'u1', '008', '3'],        // långsammare än snabbaste (2 min) → uträknad
  ['s5', 'u2', '001', 'Brazil'],   // kvar i turneringen → öppen
  ['s6', 'u2', '007', '180'],      // över nuvarande mål → öppen
  ['s7', 'u2', '008', '1:30'],     // snabbare än rekordet → öppen
  ['s8', 'u1', '009', 'Grupp C'],  // facit finns, rätt → 3 p
  ['s9', 'u2', '009', 'Grupp A'],  // facit finns, fel → 0 p
]

const args = {
  frågorRader: frågor, frågorSvarRader: svar,
  matcherRader: matcher, resultatRader: resultat,
  snabbasteMål: 2, totalMål: 170,
}

describe('frågeigenkänning', () => {
  it('känner igen mål- och snabbast-frågorna', () => {
    expect(ärMålFråga('Totalt antal mål i turneringen?')).toBe(true)
    expect(ärMålFråga('Vem vinner VM?')).toBe(false)
    expect(ärSnabbastFråga('När görs snabbaste målet?')).toBe(true)
    expect(ärSnabbastFråga('Total goals?')).toBe(false)
  })
})

describe('bedömFrågeSvar', () => {
  const bedömda = bedömFrågeSvar(args)
  const status = Object.fromEntries(svar.map((rad, i) => [rad[0], bedömda[i]]))

  it('utslaget lag på lagfråga → uträknad, 0 p', () => {
    expect(status.s1).toEqual({ status: 'uträknad', poäng: 0 })
  })
  it('fel-markerad spelare (kolumn H) → uträknad, 0 p', () => {
    expect(status.s2).toEqual({ status: 'uträknad', poäng: 0 })
  })
  it('måltips under nuvarande totalMål → uträknad; över → öppen', () => {
    expect(status.s3).toEqual({ status: 'uträknad', poäng: 0 })
    expect(status.s6.status).toBe('öppen')
  })
  it('snabbaste mål-tips långsammare än rekordet → uträknad; snabbare → öppen', () => {
    expect(status.s4).toEqual({ status: 'uträknad', poäng: 0 })
    expect(status.s7.status).toBe('öppen') // "1:30" = 1.5 min < 2
  })
  it('lag kvar i turneringen → öppen', () => {
    expect(status.s5.status).toBe('öppen')
  })
  it('facit avgör: rätt → frågans poäng, fel → 0', () => {
    expect(status.s8).toEqual({ status: 'rätt', poäng: 3 })
    expect(status.s9).toEqual({ status: 'fel', poäng: 0 })
  })
  it('måltips lika med nuvarande totalMål är fortfarande möjligt', () => {
    const [b] = bedömFrågeSvar({ ...args, frågorSvarRader: [['x', 'u3', '007', '170']] })
    expect(b.status).toBe('öppen')
  })
  it('utan totalMål/snabbasteMål markeras inget uträknat på de frågorna', () => {
    const b = bedömFrågeSvar({ ...args, snabbasteMål: null, totalMål: null })
    expect(b[2].status).toBe('öppen') // s3
    expect(b[3].status).toBe('öppen') // s4
  })
})

describe('beräknaFrågeSvarPoäng (kolumn E)', () => {
  it('mappar rätt/fel/uträknad/öppen till poäng/0/0/tomt i radordning', () => {
    expect(beräknaFrågeSvarPoäng(args)).toEqual([0, 0, 0, 0, '', '', '', 3, 0])
  })
  it('okänd fråga eller tomt svar → tomt', () => {
    const p = beräknaFrågeSvarPoäng({
      ...args,
      frågorSvarRader: [['x', 'u1', '999', 'hej'], ['y', 'u1', '001', '']],
    })
    expect(p).toEqual(['', ''])
  })
})

describe('beräknaMaxPoäng', () => {
  const nu = new Date('2026-07-06T12:00:00Z')
  const standings = [
    { user_id: 'u1', poäng: 20 },
    { user_id: 'u2', poäng: 15 },
  ]
  // Tips: A=tip_id,B=user_id,C=match_id,D=hemma,E=borta
  // k1 saknar resultat och är tippad av u1; k2 saknar resultat, otippad men
  // startade i går (inte tippbar längre); k9 (finalen) är framtida slutspel.
  const tips = [
    ['t1', 'u1', 'm1', '1', '0'], // resultat finns → ingen maxeffekt
    ['t2', 'u1', 'k1', '2', '1'],
  ]
  // Samma bracket som ovan, men k1/k2 spelas "igår" relativt nu → redan låsta.
  const maxArgs = {
    ...args, standings, tipsRader: tips, nu,
    matcherRader: [
      ['m1', '2026-06-13', '18:00 UTC-4', 'Sweden', 'Brazil',  'B', ''],
      ['m2', '2026-06-14', '18:00 UTC-4', 'France', 'Spain',   'C', ''],
      ['k1', '2026-07-05', '18:00 UTC-4', 'Brazil', 'France',  'Slutspel', 'Round of 32'],
      ['k2', '2026-07-05', '21:00 UTC-4', 'Spain',  'Germany', 'Slutspel', 'Round of 32'],
      ['k9', '2026-07-19', '15:00 UTC-4', 'W101',   'W102',    'Slutspel', 'Final'],
    ],
  }
  const max = beräknaMaxPoäng(maxArgs)

  it('u1: poäng + öppna frågor + tippad öppen match + framtida slutspel', () => {
    // u1: 20 + 0 öppna frågepoäng (alla u1:s ej avgjorda svar är uträknade)
    //     + 5×(k1 tippad) + 5×(k9 framtida) = 30
    expect(max.u1).toBe(30)
  })
  it('u2: poäng + öppna frågepoäng + bara framtida slutspel (inga tips)', () => {
    // u2: 15 + (001:10 + 007:5 + 008:5 öppna) + 5×(k9) = 40
    expect(max.u2).toBe(40)
  })
  it('otippad redan startad match utan resultat ger inga maxpoäng', () => {
    // k2 saknar resultat men är otippad och redan spelad → ingår inte för någon
    const utanK9 = beräknaMaxPoäng({
      ...maxArgs,
      matcherRader: maxArgs.matcherRader.filter((r) => r[0] !== 'k9'),
    })
    expect(utanK9.u1).toBe(25) // bara k1
    expect(utanK9.u2).toBe(35) // inga matcher alls
  })
})
