/**
 * tests/unit/scoring.test.js
 *
 * Enhetstester för den delade poänglogiken (_scoring.js).
 * Ren logik utan I/O — inga mockar behövs.
 */
import { describe, it, expect } from 'vitest'
import {
  räknaMatchPoäng,
  byggResultatMap,
  byggFrågorMap,
  byggAnvändarMap,
  dedupliceraTips,
  dedupliceraSvar,
  beräknaMatchpoängPerAnvändare,
  beräknaTopplista,
  beräknaIgår,
  beräknaTipsPoäng,
} from '../../Netlify/functions/_scoring.js'

describe('räknaMatchPoäng', () => {
  it('ger 5 för exakt rätt resultat', () => {
    expect(räknaMatchPoäng(2, 1, 2, 1)).toBe(5)
    expect(räknaMatchPoäng(0, 0, 0, 0)).toBe(5)
  })
  it('ger 2 för rätt utgång men fel mål', () => {
    expect(räknaMatchPoäng(3, 1, 2, 0)).toBe(2) // hemmavinst
    expect(räknaMatchPoäng(1, 1, 2, 2)).toBe(2) // oavgjort
    expect(räknaMatchPoäng(0, 2, 1, 3)).toBe(2) // bortavinst
  })
  it('ger 0 för fel utgång', () => {
    expect(räknaMatchPoäng(2, 0, 0, 1)).toBe(0)
    expect(räknaMatchPoäng(1, 1, 2, 0)).toBe(0)
  })
  it('ger 0 vid ogiltiga/tomma värden', () => {
    expect(räknaMatchPoäng('', 1, 2, 1)).toBe(0)
    expect(räknaMatchPoäng(undefined, undefined, 1, 1)).toBe(0)
    expect(räknaMatchPoäng('a', 'b', 1, 1)).toBe(0)
  })
  it('hanterar strängsiffror (som från Sheets)', () => {
    expect(räknaMatchPoäng('2', '1', '2', '1')).toBe(5)
  })
})

describe('byggResultatMap', () => {
  it('mappar match_id → mål och hoppar över ofullständiga rader', () => {
    const map = byggResultatMap([
      ['m1', '2', '1'],
      ['m2', '', '0'],   // saknar hemma → ignoreras
      ['m3', '0', '0'],
      [''],              // tomt → ignoreras
    ])
    expect(map).toEqual({ m1: { hemma: 2, borta: 1 }, m3: { hemma: 0, borta: 0 } })
  })
})

describe('byggFrågorMap', () => {
  it('läser poäng (idx2) och rätt_svar (idx4), normaliserar till lowercase', () => {
    const map = byggFrågorMap([
      ['f1', 'Vem vinner?', '10', 'typ', 'Sverige'],
      ['f2', 'Tom fråga', '5', 'typ', ''], // saknar rätt svar → ignoreras
    ])
    expect(map).toEqual({ f1: { poäng: 10, rätt_svar: 'sverige' } })
  })
})

describe('byggAnvändarMap', () => {
  it('mappar user_id → namn', () => {
    expect(byggAnvändarMap([['u1', 'Lelle'], ['u2', 'Anna'], ['']])).toEqual({
      u1: 'Lelle', u2: 'Anna',
    })
  })
})

const TIPS = [
  // tip_id, user_id, match_id, hemma, borta
  ['t1', 'u1', 'm1', '2', '1'], // exakt → 5
  ['t2', 'u1', 'm2', '1', '0'], // rätt utgång → 2
  ['t3', 'u2', 'm1', '0', '0'], // fel → 0
  ['t4', 'u2', 'm2', '3', '1'], // exakt → 5
]
const RESULTAT = [['m1', '2', '1'], ['m2', '3', '1']]

// Tips-arket är append-baserat → en användare kan ha flera rader för samma
// match (redigerat tips). Dessa fixtures speglar det fel som syntes i prod:
// samma match dök upp flera gånger och poängen dubbelräknades.
const TIPS_MED_DUBBLETTER = [
  ['t1', 'u1', 'm1', '2', '0'], // gammalt tips
  ['t2', 'u1', 'm1', '3', '0'], // redigerat
  ['t3', 'u1', 'm1', '2', '1'], // SENASTE (exakt mot RESULTAT m1=2-1) → 5
  ['t4', 'u1', 'm2', '0', '0'], // fel utgång mot m2=3-1 → 0
  ['t5', 'u2', 'm1', '0', '0'], // fel mot m1 → 0
]

describe('dedupliceraTips', () => {
  it('behåller bara senaste raden per (user, match)', () => {
    const ut = dedupliceraTips(TIPS_MED_DUBBLETTER)
    // 5 rader → 3 unika par: u1/m1 (3 ihopslagna), u1/m2, u2/m1
    expect(ut).toHaveLength(3)
  })
  it('senaste förekomsten vinner (sista raden i ark-ordning)', () => {
    const ut = dedupliceraTips(TIPS_MED_DUBBLETTER)
    const u1m1 = ut.find((r) => r[1] === 'u1' && r[2] === 'm1')
    expect([u1m1[3], u1m1[4]]).toEqual(['2', '1']) // t3, inte t1/t2
  })
  it('ignorerar rader utan user_id eller match_id', () => {
    expect(dedupliceraTips([['x', '', 'm1', '1', '0'], ['y', 'u1', '', '1', '0']])).toHaveLength(0)
  })
})

describe('beräknaMatchpoängPerAnvändare', () => {
  it('summerar poäng, exakta och rätta per användare', () => {
    const map = beräknaMatchpoängPerAnvändare(TIPS, byggResultatMap(RESULTAT))
    expect(map.u1).toEqual({ poäng: 7, exakta: 1, rätta: 1 })
    expect(map.u2).toEqual({ poäng: 5, exakta: 1, rätta: 0 })
  })
  it('dubbelräknar INTE när Tips har flera rader per match (regression)', () => {
    const map = beräknaMatchpoängPerAnvändare(TIPS_MED_DUBBLETTER, byggResultatMap(RESULTAT))
    // u1: bara senaste m1-tipset (exakt = 5), m2 fel (0) → 5, inte 5×3
    expect(map.u1).toEqual({ poäng: 5, exakta: 1, rätta: 0 })
    expect(map.u2).toEqual({ poäng: 0, exakta: 0, rätta: 0 })
  })
  it('respekterar matchFilter', () => {
    const map = beräknaMatchpoängPerAnvändare(TIPS, byggResultatMap(RESULTAT), new Set(['m1']))
    expect(map.u1).toEqual({ poäng: 5, exakta: 1, rätta: 0 })
    expect(map.u2).toEqual({ poäng: 0, exakta: 0, rätta: 0 })
  })
})

describe('beräknaTopplista', () => {
  it('lägger ihop matchpoäng + frågepoäng och sorterar', () => {
    const lista = beräknaTopplista({
      resultatRader: RESULTAT,
      tipsRader: TIPS,
      frågorRader: [['f1', 'q', '10', 'typ', 'sverige']],
      frågorSvarRader: [['s1', 'u2', 'f1', 'Sverige']], // rätt → +10
      användareRader: [['u1', 'Lelle'], ['u2', 'Anna']],
    })
    expect(lista[0]).toMatchObject({ user_id: 'u2', poäng: 15, frågepoäng: 10, plats: 1 })
    expect(lista[1]).toMatchObject({ user_id: 'u1', poäng: 7, frågepoäng: 0, plats: 2 })
  })
  it('namnger okända användare "Okänd"', () => {
    const lista = beräknaTopplista({ resultatRader: RESULTAT, tipsRader: TIPS, användareRader: [] })
    expect(lista.every((r) => r.namn === 'Okänd')).toBe(true)
  })
  it('dubbelräknar varken match- eller frågepoäng vid dubblettrader (regression)', () => {
    const lista = beräknaTopplista({
      resultatRader: RESULTAT,
      tipsRader: TIPS_MED_DUBBLETTER, // u1 har 3 rader för m1
      frågorRader: [['f1', 'q', '10', 'typ', 'sverige']],
      frågorSvarRader: [
        ['s1', 'u1', 'f1', 'Norge'],   // gammalt fel svar
        ['s2', 'u1', 'f1', 'Sverige'], // SENASTE rätt svar → +10 EN gång
      ],
      användareRader: [['u1', 'Lelle'], ['u2', 'Anna']],
    })
    const lelle = lista.find((r) => r.user_id === 'u1')
    // 5 (senaste m1-tipset) + 10 (frågan en gång) = 15, inte uppblåst
    expect(lelle).toMatchObject({ poäng: 15, frågepoäng: 10, exakta: 1 })
  })
})

describe('dedupliceraSvar', () => {
  it('behåller bara senaste svaret per (user, fråga)', () => {
    const ut = dedupliceraSvar([
      ['s1', 'u1', 'f1', 'Norge'],
      ['s2', 'u1', 'f1', 'Sverige'], // senaste
      ['s3', 'u1', 'f2', '3'],
    ])
    expect(ut).toHaveLength(2)
    expect(ut.find((r) => r[2] === 'f1')[3]).toBe('Sverige')
  })
  it('ignorerar rader utan user_id eller fråga_id', () => {
    expect(dedupliceraSvar([['s', '', 'f1', 'x'], ['s', 'u1', '', 'x']])).toHaveLength(0)
  })
})

describe('beräknaIgår', () => {
  it('returnerar topp N enbart för angivna matcher med resultat', () => {
    const topp = beräknaIgår({
      igårMatchIds: new Set(['m1']),
      resultatRader: RESULTAT,
      tipsRader: TIPS,
      användareRader: [['u1', 'Lelle'], ['u2', 'Anna']],
      antal: 3,
    })
    expect(topp).toHaveLength(1)          // bara u1 fick poäng på m1
    expect(topp[0]).toMatchObject({ user_id: 'u1', poäng: 5 })
  })
  it('returnerar [] om inga matcher har resultat', () => {
    expect(beräknaIgår({ igårMatchIds: new Set(['mX']), resultatRader: RESULTAT, tipsRader: TIPS }))
      .toEqual([])
  })
})

describe('beräknaTipsPoäng', () => {
  it('ger poäng i samma ordning som tips, tomt när resultat saknas', () => {
    const poäng = beräknaTipsPoäng(
      [...TIPS, ['t5', 'u1', 'mUtan', '1', '1']],
      byggResultatMap(RESULTAT),
    )
    expect(poäng).toEqual([5, 2, 0, 5, ''])
  })
})
