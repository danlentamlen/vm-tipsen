/**
 * tests/unit/reminderMottagare.test.js
 *
 * Enhetstester för planeraMottagare i admin-reminder.js — den rena logiken
 * som avgör vilka som ska få påminnelse. Rader = [user_id, namn, email].
 */
import { describe, it, expect } from 'vitest'
import { planeraMottagare, filtreraRedanSkickade, medTimeout } from '../../Netlify/functions/admin-reminder.js'

const rader = [
  ['u1', 'Anna Andersson', 'anna@example.com'],
  ['u2', 'Bertil Bengtsson', 'bertil@example.com'],
  ['u3', 'Cecilia Carlsson', ''],        // saknar e-post
  ['',   'Tom rad',          'x@y.z'],   // saknar user_id
  ['u4', 'David Davidsson', 'david@example.com'],
]

describe('planeraMottagare — all:true', () => {
  it('tar alla med giltig e-post och user_id', () => {
    const { mottagare, utanEpost } = planeraMottagare(rader, { all: true })
    expect(mottagare.map((m) => m.user_id)).toEqual(['u1', 'u2', 'u4'])
    expect(utanEpost).toEqual(['u3'])
  })

  it('behåller sheet-ordning och fyller i namn-fallback', () => {
    const { mottagare } = planeraMottagare([['u9', '', 'a@b.c']], { all: true })
    expect(mottagare[0]).toEqual({ user_id: 'u9', namn: 'Deltagare', email: 'a@b.c' })
  })
})

describe('planeraMottagare — user_ids', () => {
  it('filtrerar på angivna user_ids', () => {
    const { mottagare } = planeraMottagare(rader, { user_ids: ['u2', 'u4'] })
    expect(mottagare.map((m) => m.user_id)).toEqual(['u2', 'u4'])
  })

  it('vald användare utan e-post hamnar i utanEpost, inte mottagare', () => {
    const { mottagare, utanEpost } = planeraMottagare(rader, { user_ids: ['u3'] })
    expect(mottagare).toEqual([])
    expect(utanEpost).toEqual(['u3'])
  })

  it('okända user_ids ignoreras', () => {
    const { mottagare, utanEpost } = planeraMottagare(rader, { user_ids: ['finns-ej'] })
    expect(mottagare).toEqual([])
    expect(utanEpost).toEqual([])
  })

  it('tom lista ger inga mottagare', () => {
    const { mottagare } = planeraMottagare(rader, { user_ids: [] })
    expect(mottagare).toEqual([])
  })
})

// ── Idempotens via Maillogg ─────────────────────────────────────────────────
const mottagare = [
  { user_id: 'u1', namn: 'Anna', email: 'anna@example.com' },
  { user_id: 'u2', namn: 'Bertil', email: 'bertil@example.com' },
  { user_id: 'u4', namn: 'David', email: 'david@example.com' },
]

describe('filtreraRedanSkickade', () => {
  it('hoppar över mottagare som redan loggats för samma batch', () => {
    const logg = [
      ['batch-A', 'u1'],
      ['batch-A', 'u4'],
    ]
    const { kvar, redanSkickade } = filtreraRedanSkickade(mottagare, logg, 'batch-A')
    expect(kvar.map((m) => m.user_id)).toEqual(['u2'])
    expect(redanSkickade).toEqual(['u1', 'u4'])
  })

  it('ignorerar loggrader från andra batchar', () => {
    const logg = [['batch-B', 'u1'], ['batch-B', 'u2']]
    const { kvar, redanSkickade } = filtreraRedanSkickade(mottagare, logg, 'batch-A')
    expect(kvar).toHaveLength(3)
    expect(redanSkickade).toEqual([])
  })

  it('utan batch_id filtreras inget (bakåtkompatibelt)', () => {
    const { kvar, redanSkickade } = filtreraRedanSkickade(mottagare, [['x', 'u1']], undefined)
    expect(kvar).toHaveLength(3)
    expect(redanSkickade).toEqual([])
  })

  it('tål tom/saknad logg och trasiga rader', () => {
    expect(filtreraRedanSkickade(mottagare, null, 'batch-A').kvar).toHaveLength(3)
    expect(filtreraRedanSkickade(mottagare, [[], [null, null], ['batch-A']], 'batch-A').kvar).toHaveLength(3)
  })

  it('alla redan skickade → kvar är tom (servern svarar done)', () => {
    const logg = mottagare.map((m) => ['batch-A', m.user_id])
    const { kvar, redanSkickade } = filtreraRedanSkickade(mottagare, logg, 'batch-A')
    expect(kvar).toEqual([])
    expect(redanSkickade).toEqual(['u1', 'u2', 'u4'])
  })
})

describe('medTimeout', () => {
  it('släpper igenom snabb promise', async () => {
    await expect(medTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok')
  })

  it('kastar vid timeout', async () => {
    const långsam = new Promise((r) => setTimeout(r, 500))
    await expect(medTimeout(långsam, 30)).rejects.toThrow(/timeout/i)
  })

  it('propagerar fel från själva promisen', async () => {
    await expect(medTimeout(Promise.reject(new Error('smtp-fel')), 100)).rejects.toThrow('smtp-fel')
  })
})
