/**
 * tests/unit/skytteliga.test.js
 *
 * Tester för FIFA-logiken i skytteligan: mål avgör, assists är skiljedomare.
 * Ren logik — inga nätverks-/Sheets-anrop.
 */
import { describe, it, expect } from 'vitest'
import {
  normaliseraNamn,
  byggAssistkarta,
  slåUppAssists,
  sorteraFifa,
  byggWidgetSkytteliga,
  rankaFdScorers,
} from '../../Netlify/functions/_skytteliga.js'

describe('normaliseraNamn', () => {
  it('tar bort diakriter och normaliserar', () => {
    expect(normaliseraNamn('Kylian Mbappé')).toBe('kylian mbappe')
    expect(normaliseraNamn('  Erling  Haaland ')).toBe('erling haaland')
    expect(normaliseraNamn("N'Golo Kanté")).toBe('n golo kante')
  })
  it('hanterar tomt/undefined', () => {
    expect(normaliseraNamn('')).toBe('')
    expect(normaliseraNamn(undefined)).toBe('')
  })
})

describe('sorteraFifa', () => {
  it('sorterar på mål fallande', () => {
    const r = sorteraFifa([{ mål: 3 }, { mål: 7 }, { mål: 5 }])
    expect(r.map((x) => x.mål)).toEqual([7, 5, 3])
  })
  it('bryter lika mål på assists', () => {
    const r = sorteraFifa([
      { spelare: 'A', mål: 5, assists: 1 },
      { spelare: 'B', mål: 5, assists: 4 },
      { spelare: 'C', mål: 5, assists: 2 },
    ])
    expect(r.map((x) => x.spelare)).toEqual(['B', 'C', 'A'])
  })
  it('behåller stabil ordning vid exakt lika mål+assists', () => {
    const r = sorteraFifa([
      { spelare: 'X', mål: 4, assists: 2 },
      { spelare: 'Y', mål: 4, assists: 2 },
    ])
    expect(r.map((x) => x.spelare)).toEqual(['X', 'Y'])
  })
  it('muterar inte indata', () => {
    const input = [{ mål: 1 }, { mål: 9 }]
    sorteraFifa(input)
    expect(input.map((x) => x.mål)).toEqual([1, 9])
  })
})

describe('byggAssistkarta + slåUppAssists', () => {
  const fd = [
    { player: { name: 'Kylian Mbappé' }, assists: 3 },
    { player: { name: 'Harry Kane' }, assists: 1 },
    { player: { name: 'Erling Haaland' }, assists: 0 },
  ]
  it('matchar på fullständigt namn trots diakriter', () => {
    const karta = byggAssistkarta(fd)
    expect(slåUppAssists('Kylian Mbappe', karta)).toBe(3)
    expect(slåUppAssists('Harry Kane', karta)).toBe(1)
  })
  it('faller tillbaka på entydigt efternamn', () => {
    const karta = byggAssistkarta(fd)
    expect(slåUppAssists('H. Kane', karta)).toBe(1)
  })
  it('matchar INTE tvetydigt efternamn', () => {
    const karta = byggAssistkarta([
      { player: { name: 'Phil Foden' }, assists: 2 },
      { player: { name: 'Ricky Foden' }, assists: 5 },
    ])
    expect(slåUppAssists('X. Foden', karta)).toBe(0)
  })
  it('ger 0 vid ingen träff eller saknad karta', () => {
    const karta = byggAssistkarta(fd)
    expect(slåUppAssists('Okänd Spelare', karta)).toBe(0)
    expect(slåUppAssists('Kylian Mbappe', null)).toBe(0)
  })
})

describe('byggWidgetSkytteliga', () => {
  const rader = [
    ['Erling Haaland', 'Norway', '5'],
    ['Harry Kane', 'England', '5'],
    ['Kylian Mbappé', 'France', '7'],
    ['Ingen Mål', 'Sweden', '0'],
    ['Tom Rad', 'Spain', ''],
  ]
  const karta = byggAssistkarta([
    { player: { name: 'Kylian Mbappé' }, assists: 2 },
    { player: { name: 'Harry Kane' }, assists: 4 },
    { player: { name: 'Erling Haaland' }, assists: 1 },
  ])

  it('sorterar mål först, assists som tiebreak, filtrerar bort 0-mål', () => {
    const r = byggWidgetSkytteliga(rader, karta, 5)
    expect(r.map((x) => x.spelare)).toEqual(['Kylian Mbappé', 'Harry Kane', 'Erling Haaland'])
    expect(r.map((x) => x.assists)).toEqual([2, 4, 1])
  })

  it('degraderar till mål-only när assist-data saknas (samma som tidigare)', () => {
    const r = byggWidgetSkytteliga(rader, byggAssistkarta([]), 5)
    // 7 > 5, och de två femmorna behåller arkets ordning (stabil)
    expect(r.map((x) => x.mål)).toEqual([7, 5, 5])
    expect(r.every((x) => x.assists === 0)).toBe(true)
  })

  it('respekterar topp-gränsen', () => {
    expect(byggWidgetSkytteliga(rader, karta, 2)).toHaveLength(2)
  })

  it('låter arkets kolumn D (assists) styra före football-data', () => {
    // Messi & Mbappé båda 8 mål. Arket säger Messi 4 ass, Mbappé 3 → Messi först.
    const ark = [
      ['Kylian Mbappé', 'France', '8', '3'],
      ['Lionel Messi', 'Argentina', '8', '4'],
    ]
    // football-data säger tvärtom (ska ignoreras när D finns)
    const fdKarta = byggAssistkarta([
      { player: { name: 'Kylian Mbappé' }, assists: 9 },
      { player: { name: 'Lionel Messi' }, assists: 0 },
    ])
    const r = byggWidgetSkytteliga(ark, fdKarta, 5)
    expect(r.map((x) => x.spelare)).toEqual(['Lionel Messi', 'Kylian Mbappé'])
    expect(r.map((x) => x.assists)).toEqual([4, 3])
  })

  it('faller tillbaka på football-data när kolumn D är tom', () => {
    const ark = [
      ['Kylian Mbappé', 'France', '8', ''],
      ['Lionel Messi', 'Argentina', '8'],   // ingen D-cell alls
    ]
    const fdKarta = byggAssistkarta([
      { player: { name: 'Kylian Mbappé' }, assists: 3 },
      { player: { name: 'Lionel Messi' }, assists: 4 },
    ])
    const r = byggWidgetSkytteliga(ark, fdKarta, 5)
    expect(r.map((x) => x.spelare)).toEqual(['Lionel Messi', 'Kylian Mbappé'])
    expect(r.map((x) => x.assists)).toEqual([4, 3])
  })

  it('kan blanda arkets D och football-data-fallback per spelare', () => {
    const ark = [
      ['Kylian Mbappé', 'France', '8', '3'],  // D ifylld
      ['Lionel Messi', 'Argentina', '8'],      // D saknas → fallback
    ]
    const fdKarta = byggAssistkarta([{ player: { name: 'Lionel Messi' }, assists: 4 }])
    const r = byggWidgetSkytteliga(ark, fdKarta, 5)
    expect(r.map((x) => [x.spelare, x.assists])).toEqual([
      ['Lionel Messi', 4], ['Kylian Mbappé', 3],
    ])
  })

  it('behandlar D=0 som ett riktigt värde (inte tomt)', () => {
    const ark = [
      ['A', 'X', '5', '0'],
      ['B', 'Y', '5', '2'],
    ]
    // football-data skulle ge A högre — men D=0 ska gälla
    const fdKarta = byggAssistkarta([{ player: { name: 'A' }, assists: 9 }])
    const r = byggWidgetSkytteliga(ark, fdKarta, 5)
    expect(r.map((x) => x.spelare)).toEqual(['B', 'A'])
  })
})

describe('rankaFdScorers', () => {
  it('sätter plats efter FIFA-sort', () => {
    const r = rankaFdScorers([
      { player: { name: 'A' }, team: { name: 'X' }, goals: 5, assists: 1, playedMatches: 6 },
      { player: { name: 'B' }, team: { name: 'Y' }, goals: 5, assists: 3, playedMatches: 6 },
      { player: { name: 'C' }, team: { name: 'Z' }, goals: 6, assists: 0, playedMatches: 6 },
    ])
    expect(r.map((x) => [x.plats, x.namn])).toEqual([
      [1, 'C'], [2, 'B'], [3, 'A'],
    ])
  })
  it('hanterar tomt svar', () => {
    expect(rankaFdScorers([])).toEqual([])
    expect(rankaFdScorers(undefined)).toEqual([])
  })
})
