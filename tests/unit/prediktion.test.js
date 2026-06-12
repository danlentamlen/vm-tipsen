/**
 * tests/unit/prediktion.test.js
 *
 * Enhetstester för Monte Carlo-prognosen (src/utils/prediktion.js).
 * Ren logik med seedbar PRNG → deterministisk och mockfri.
 */
import { describe, it, expect } from 'vitest'
import {
  härledForm,
  simuleraSlutplacering,
  prognosForSpelare,
  TOTAL_MATCHER_VM2026,
  MIN_MATCHER_FOR_PROGNOS,
} from '../../src/utils/prediktion.js'

describe('härledForm', () => {
  it('räknar ut sannolikheter ur exakta/rätta per spelad match', () => {
    const f = härledForm({ exakta: 2, rätta: 4 }, 10)
    expect(f.pExakt).toBeCloseTo(0.2)
    expect(f.pRätt).toBeCloseTo(0.4)
  })
  it('ger noll-form utan spelade matcher', () => {
    expect(härledForm({ exakta: 0, rätta: 0 }, 0)).toEqual({ pExakt: 0, pRätt: 0 })
  })
  it('aldrig fler träffar än spelade matcher (skyddsräknare)', () => {
    const f = härledForm({ exakta: 8, rätta: 8 }, 4) // orimligt: fler träffar än matcher
    expect(f.pExakt + f.pRätt).toBeLessThanOrEqual(1)
  })
})

describe('simuleraSlutplacering', () => {
  const topplista = [
    { user_id: 'a', namn: 'Alice', poäng: 50, exakta: 6, rätta: 8, frågepoäng: 4 },
    { user_id: 'b', namn: 'Bob',   poäng: 40, exakta: 4, rätta: 7, frågepoäng: 2 },
    { user_id: 'c', namn: 'Cecil', poäng: 20, exakta: 1, rätta: 5, frågepoäng: 0 },
  ]

  it('är deterministisk med samma seed', () => {
    const a = simuleraSlutplacering(topplista, { speladeMatcher: 20, simuleringar: 500, seed: 7 })
    const b = simuleraSlutplacering(topplista, { speladeMatcher: 20, simuleringar: 500, seed: 7 })
    expect(a.get('a')).toEqual(b.get('a'))
    expect(a.get('c')).toEqual(b.get('c'))
  })

  it('ledaren med bäst form får lägst förväntad placering och högst vinstchans', () => {
    const r = simuleraSlutplacering(topplista, { speladeMatcher: 20, simuleringar: 2000, seed: 1 })
    const a = r.get('a'), b = r.get('b'), c = r.get('c')
    expect(a.förväntadPlacering).toBeLessThan(b.förväntadPlacering)
    expect(b.förväntadPlacering).toBeLessThan(c.förväntadPlacering)
    expect(a.vinstChans).toBeGreaterThan(b.vinstChans)
  })

  it('vinstchanser summerar till ~1 över alla spelare', () => {
    const r = simuleraSlutplacering(topplista, { speladeMatcher: 20, simuleringar: 1000, seed: 3 })
    const summa = [...r.values()].reduce((s, v) => s + v.vinstChans, 0)
    expect(summa).toBeCloseTo(1, 5)
  })

  it('inga kvarvarande matcher → prognos = nuvarande ordning', () => {
    const r = simuleraSlutplacering(topplista, { speladeMatcher: TOTAL_MATCHER_VM2026, simuleringar: 100, seed: 9 })
    expect(r.get('a').förväntadPlacering).toBe(1)
    expect(r.get('b').förväntadPlacering).toBe(2)
    expect(r.get('c').förväntadPlacering).toBe(3)
    expect(r.get('a').vinstChans).toBe(1)
  })

  it('tom topplista ger tom map', () => {
    expect(simuleraSlutplacering([], { speladeMatcher: 10 }).size).toBe(0)
  })

  it('en outsider med het form kan spås gå om en med fler poäng men sämre form', () => {
    // Dark har färre poäng men nästan dubbelt så hög träffprocent som Lead.
    const lista = [
      { user_id: 'lead', poäng: 60, exakta: 2, rätta: 6, frågepoäng: 0 }, // svag form, hög bas
      { user_id: 'dark', poäng: 48, exakta: 10, rätta: 8, frågepoäng: 0 }, // het form, lägre bas
    ]
    const r = simuleraSlutplacering(lista, { speladeMatcher: 30, simuleringar: 3000, seed: 5 })
    // Med 74 matcher kvar hinner formskillnaden vända placeringen.
    expect(r.get('dark').förväntadPlacering).toBeLessThan(r.get('lead').förväntadPlacering)
  })
})

describe('prognosForSpelare', () => {
  const topplista = [
    { user_id: 'a', poäng: 50, exakta: 6, rätta: 8, frågepoäng: 4 },
    { user_id: 'b', poäng: 40, exakta: 4, rätta: 7, frågepoäng: 2 },
  ]

  it('returnerar avrundad placering och procent', () => {
    const p = prognosForSpelare(topplista, 'a', { speladeMatcher: 20, simuleringar: 500, seed: 2 })
    expect(p).not.toBeNull()
    expect(Number.isInteger(p.slutplacering)).toBe(true)
    expect(p.vinstChansProcent).toBeGreaterThanOrEqual(0)
    expect(p.vinstChansProcent).toBeLessThanOrEqual(100)
  })

  it('returnerar null under tröskeln för spelade matcher', () => {
    expect(prognosForSpelare(topplista, 'a', { speladeMatcher: MIN_MATCHER_FOR_PROGNOS - 1 })).toBeNull()
  })

  it('returnerar null för okänd user_id', () => {
    expect(prognosForSpelare(topplista, 'finns-ej', { speladeMatcher: 20 })).toBeNull()
  })
})
