/**
 * prediktion.js — Förutspådd slutplacering via Monte Carlo-simulering
 *
 * Alla deltagare tippar samma matcher, så ren extrapolering av poäng behåller
 * i princip nuvarande ordning. För att få en intressant prognos modellerar vi
 * istället varje spelares FORM som en sannolikhetsfördelning och simulerar de
 * kvarvarande matcherna många gånger:
 *
 *   pExakt = exakta / spelade matcher   → 5 poäng
 *   pRätt  = rätta  / spelade matcher   → 2 poäng
 *   annars                              → 0 poäng
 *
 * För varje simulering slumpas utfallet för varje kvarvarande match per spelare,
 * slutpoängen rankas, och vi summerar placeringar över alla simuleringar. Snittet
 * blir "förväntad slutplacering" och andelen förstaplatser blir "vinstchans".
 *
 * Ren funktion utan I/O eller sidoeffekter → enhetstestbar (tests/unit/prediktion.test.js).
 * Seedbar PRNG gör simuleringen reproducerbar.
 */

// Totalt antal matcher i VM 2026 (72 gruppspel + 32 slutspel).
export const TOTAL_MATCHER_VM2026 = 104

// Minsta antal spelade matcher innan en prognos är meningsfull.
export const MIN_MATCHER_FOR_PROGNOS = 5

// mulberry32 — liten, snabb, seedbar PRNG. Ger reproducerbara simuleringar.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Härleder en spelares form-sannolikheter ur topplisteraden.
 * matchpoäng = poäng − frågepoäng (frågepoäng är engångspoäng, ingen framtida form).
 */
export function härledForm(rad, speladeMatcher) {
  const exakta = Math.max(0, Number(rad?.exakta) || 0)
  const rätta = Math.max(0, Number(rad?.rätta) || 0)
  // Skyddsräknare: aldrig färre "spelade" än spelarens egna träffar.
  const spelade = Math.max(Number(speladeMatcher) || 0, exakta + rätta)
  if (spelade <= 0) return { pExakt: 0, pRätt: 0 }
  let pExakt = exakta / spelade
  let pRätt = rätta / spelade
  // Säkra att de är giltiga sannolikheter som inte överstiger 1 tillsammans.
  if (pExakt + pRätt > 1) {
    const k = 1 / (pExakt + pRätt)
    pExakt *= k
    pRätt *= k
  }
  return { pExakt, pRätt }
}

/**
 * Simulerar slutplaceringar för hela topplistan.
 *
 * @param {Array} topplista  [{ user_id, poäng, exakta, rätta, frågepoäng }]
 * @param {Object} opts
 *   speladeMatcher  antal hittills spelade matcher (samma för alla)
 *   totalMatcher    totalt antal matcher i turneringen (default 104)
 *   simuleringar    antal Monte Carlo-körningar (default 2000)
 *   seed            PRNG-seed för reproducerbarhet (default 1337)
 * @returns {Map<user_id, { förväntadPlacering, vinstChans, förväntadPoäng }>}
 */
export function simuleraSlutplacering(topplista = [], opts = {}) {
  const {
    speladeMatcher = 0,
    totalMatcher = TOTAL_MATCHER_VM2026,
    simuleringar = 2000,
    seed = 1337,
  } = opts

  const n = topplista.length
  const resultat = new Map()
  if (n === 0) return resultat

  const kvar = Math.max(0, Math.round(totalMatcher) - Math.round(speladeMatcher))

  const spelare = topplista.map((r) => {
    const { pExakt, pRätt } = härledForm(r, speladeMatcher)
    return { user_id: r.user_id, baspoäng: Number(r.poäng) || 0, pExakt, pRätt }
  })

  // Inga matcher kvar → prognos = nuvarande ordning (stabil sortering, ties → index).
  if (kvar === 0) {
    const ordning = spelare
      .map((s, i) => ({ i, p: s.baspoäng }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
    ordning.forEach((o, idx) => {
      resultat.set(spelare[o.i].user_id, {
        förväntadPlacering: idx + 1,
        vinstChans: idx === 0 ? 1 : 0,
        förväntadPoäng: spelare[o.i].baspoäng,
      })
    })
    return resultat
  }

  const rand = mulberry32(seed)
  const placeringSumma = new Array(n).fill(0)
  const poängSumma = new Array(n).fill(0)
  const vinster = new Array(n).fill(0)
  const slutpoäng = new Array(n)

  for (let sim = 0; sim < simuleringar; sim++) {
    for (let i = 0; i < n; i++) {
      const s = spelare[i]
      let p = s.baspoäng
      const tröskelRätt = s.pExakt + s.pRätt
      for (let m = 0; m < kvar; m++) {
        const x = rand()
        if (x < s.pExakt) p += 5
        else if (x < tröskelRätt) p += 2
      }
      slutpoäng[i] = p
      poängSumma[i] += p
    }
    // Ranka denna simulering (högst poäng först, ties → lägre index).
    const ordning = slutpoäng
      .map((p, i) => ({ i, p }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
    ordning.forEach((o, idx) => { placeringSumma[o.i] += idx + 1 })
    vinster[ordning[0].i] += 1
  }

  for (let i = 0; i < n; i++) {
    resultat.set(spelare[i].user_id, {
      förväntadPlacering: placeringSumma[i] / simuleringar,
      vinstChans: vinster[i] / simuleringar,
      förväntadPoäng: poängSumma[i] / simuleringar,
    })
  }
  return resultat
}

/**
 * Bekvämlighet: prognos för EN spelare, eller null om underlag saknas.
 * Returnerar avrundad slutplacering och vinstchans i procent.
 */
export function prognosForSpelare(topplista, user_id, opts = {}) {
  const speladeMatcher = Number(opts.speladeMatcher) || 0
  if (!user_id || speladeMatcher < MIN_MATCHER_FOR_PROGNOS) return null
  if (!Array.isArray(topplista) || topplista.length === 0) return null
  const alla = simuleraSlutplacering(topplista, opts)
  const min = alla.get(user_id)
  if (!min) return null
  return {
    slutplacering: Math.round(min.förväntadPlacering),
    förväntadPlaceringExakt: min.förväntadPlacering,
    vinstChansProcent: Math.round(min.vinstChans * 100),
    förväntadPoäng: Math.round(min.förväntadPoäng),
  }
}
