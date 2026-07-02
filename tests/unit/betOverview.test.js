/**
 * tests/unit/betOverview.test.js
 *
 * Tester för byggBettingöversikt() — den rena aggregeringen bakom
 * bettingöversikten. Täcker: gruppspelsfilter, dedup av tips/svar,
 * procentfördelning, markering av rätt resultat/svar, samt att facit
 * INTE avslöjas innan det är ifyllt.
 */
import { describe, it, expect } from 'vitest'
import { byggBettingöversikt } from '../../Netlify/functions/_scoring.js'

// Matcher: A=match_id,B=datum,C=tid,D=hemma,E=borta,F=grupp
const matcherRader = [
  ['match_001', '2026-06-13', '18:00 UTC-4', 'USA', 'Paraguay', 'A'],
  ['match_002', '2026-06-14', '21:00 UTC-4', 'Sweden', 'Brazil', 'B'],
  ['ko_001',    '2026-07-04', '21:00 UTC-4', 'USA', 'Brazil', 'Slutspel'],  // kända lag → tas med
  ['ko_002',    '2026-07-05', '21:00 UTC-4', 'W73', '1A',     'Slutspel'],  // platshållare → filtreras bort
]

// Tips: A=tip_id,B=user_id,C=match_id,D=hemma,E=borta
const tipsRader = [
  ['t1', 'u1', 'match_001', '2', '1'],
  ['t2', 'u2', 'match_001', '2', '1'],
  ['t3', 'u3', 'match_001', '1', '0'],
  ['t4', 'u1', 'match_001', '3', '0'], // u1 redigerar → ska ersätta t1 (dedup)
  ['t5', 'u1', 'match_002', '0', '0'],
]

// Resultat: A=match_id,B=hemma,C=borta — bara match_001 är spelad
const resultatRader = [
  ['match_001', '2', '1'],
]

// Frågor: A=id,B=fråga,C=poäng,D=typ,E=rätt_svar,F=fråga_en
const frågorRader = [
  ['q1', 'Vem vinner VM?', '10', 'team', 'Brazil', 'Who wins the World Cup?'],
  ['q2', 'Skyttekung?', '5', 'text', '', 'Top scorer?'], // facit ej ifyllt
]

// FrågorSvar: A=id,B=user_id,C=fråga_id,D=svar
const frågorSvarRader = [
  ['s1', 'u1', 'q1', 'Brazil'],
  ['s2', 'u2', 'q1', 'brazil'],   // annan skiftläge — samma svar
  ['s3', 'u3', 'q1', 'France'],
  ['s4', 'u1', 'q1', 'Argentina'], // u1 redigerar → ersätter s1 (dedup)
  ['s5', 'u1', 'q2', 'Mbappé'],
]

const res = byggBettingöversikt({ matcherRader, tipsRader, resultatRader, frågorRader, frågorSvarRader })

describe('byggBettingöversikt — matcher', () => {
  it('tar med slutspel med kända lag men filtrerar bort platshållar-slutspel', () => {
    // Sedan 1c85f39 visas knockout-matcher i översikten när lagen är kända
    // (Slutspel-chippet). Matcher med platshållare ("W73", "1A") hoppas över.
    expect(res.matcher.map((m) => m.match_id)).toEqual(['match_001', 'match_002', 'ko_001'])
  })

  it('dedupli, räknar och procentfördelar tippade resultat', () => {
    const m1 = res.matcher.find((m) => m.match_id === 'match_001')
    expect(m1.totalt).toBe(3) // u1(senaste 3-0), u2(2-1), u3(1-0)
    const map = Object.fromEntries(m1.fördelning.map((f) => [f.resultat, f]))
    expect(map['2-1'].antal).toBe(1)
    expect(map['3-0'].antal).toBe(1)
    expect(map['1-0'].antal).toBe(1)
    expect(map['2-1'].procent).toBe(33)
  })

  it('exponerar resultat och markerar rätt rad när matchen är spelad', () => {
    const m1 = res.matcher.find((m) => m.match_id === 'match_001')
    expect(m1.resultat).toBe('2-1')
    expect(m1.fördelning.find((f) => f.resultat === '2-1').rätt).toBe(true)
    expect(m1.fördelning.find((f) => f.resultat === '3-0').rätt).toBe(false)
  })

  it('lämnar resultat null och inget markerat för ospelad match', () => {
    const m2 = res.matcher.find((m) => m.match_id === 'match_002')
    expect(m2.resultat).toBeNull()
    expect(m2.fördelning.every((f) => f.rätt === false)).toBe(true)
  })
})

describe('byggBettingöversikt — frågor', () => {
  it('dedupli, räknar svar skiftlägesokänsligt och markerar facit', () => {
    const q1 = res.frågor.find((f) => f.fråga_id === 'q1')
    expect(q1.rätt_svar).toBe('Brazil')
    expect(q1.totalt).toBe(3) // u1(senaste Argentina), u2(brazil), u3(France)
    const brazil = q1.fördelning.find((d) => d.svar.toLowerCase() === 'brazil')
    expect(brazil.antal).toBe(1)
    expect(brazil.rätt).toBe(true)
  })

  it('avslöjar inte facit innan det är ifyllt', () => {
    const q2 = res.frågor.find((f) => f.fråga_id === 'q2')
    expect(q2.rätt_svar).toBeNull()
    expect(q2.fördelning.every((d) => d.rätt === false)).toBe(true)
  })

  it('tar med engelsk frågetext när den finns', () => {
    const q1 = res.frågor.find((f) => f.fråga_id === 'q1')
    expect(q1.fråga_en).toBe('Who wins the World Cup?')
    expect(q1.poäng).toBe(10)
  })
})
