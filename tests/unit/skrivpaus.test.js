/**
 * tests/unit/skrivpaus.test.js
 *
 * Tester för ärSkrivpaus() — ren funktion som styr sync-results pausfönster
 * 10:00–18:00 CEST (= 08:00–16:00 UTC). I fönstret görs inga skrivningar till
 * Sheets eftersom inga VM-matcher avgörs då (nordamerikanska tidszoner).
 */
import { describe, it, expect } from 'vitest'
import { ärSkrivpaus } from '../../Netlify/functions/sync-results.js'

// Hjälpare: bygg ett Date med given UTC-timme.
const utcHour = (h) => new Date(Date.UTC(2026, 5, 13, h, 30, 0))

describe('ärSkrivpaus', () => {
  it('pausar i fönstret 08:00–15:59 UTC (10–18 CEST)', () => {
    expect(ärSkrivpaus(utcHour(8))).toBe(true)   // 10:00 CEST
    expect(ärSkrivpaus(utcHour(12))).toBe(true)  // mitt i fönstret
    expect(ärSkrivpaus(utcHour(15))).toBe(true)  // 17:30 CEST
  })

  it('skriver utanför fönstret (kväll/natt/morgon)', () => {
    expect(ärSkrivpaus(utcHour(16))).toBe(false) // 18:30 CEST — matcher kan ha startat
    expect(ärSkrivpaus(utcHour(20))).toBe(false) // kväll
    expect(ärSkrivpaus(utcHour(2))).toBe(false)  // natt
    expect(ärSkrivpaus(utcHour(7))).toBe(false)  // strax före fönstret (09:30 CEST)
  })

  it('är inklusiv vid 08:00 och exklusiv vid 16:00 UTC', () => {
    expect(ärSkrivpaus(new Date(Date.UTC(2026, 5, 13, 8, 0, 0)))).toBe(true)
    expect(ärSkrivpaus(new Date(Date.UTC(2026, 5, 13, 16, 0, 0)))).toBe(false)
  })
})
