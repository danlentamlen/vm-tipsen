/**
 * tests/unit/reminderMottagare.test.js
 *
 * Enhetstester för planeraMottagare i admin-reminder.js — den rena logiken
 * som avgör vilka som ska få påminnelse. Rader = [user_id, namn, email].
 */
import { describe, it, expect } from 'vitest'
import { planeraMottagare } from '../../Netlify/functions/admin-reminder.js'

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
