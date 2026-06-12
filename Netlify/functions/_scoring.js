/**
 * _scoring.js — Delad, ren poänglogik (single source of truth)
 *
 * Tidigare låg samma poängberäkning kopierad i scores.js, scores-yesterday.js,
 * match-stats.js och participants.js. Den är nu samlad här som rena funktioner
 * utan sidoeffekter eller externa beroenden, så att den:
 *   1. kan enhetstestas isolerat (se tests/unit/scoring.test.js)
 *   2. ger exakt samma poäng överallt (topplista, "bäst igår", profil, snapshot)
 *
 * Poängregler (oförändrade):
 *   - Exakt rätt resultat        → 5 poäng
 *   - Rätt utgång (1X2), fel mål  → 2 poäng
 *   - Fel utgång                 → 0 poäng
 *   - Tilläggsfråga med rätt svar → frågans poäng
 */

// ── Matchpoäng ──────────────────────────────────────────────────────────────
export function räknaMatchPoäng(tipHemma, tipBorta, resultatHemma, resultatBorta) {
  const th = parseInt(tipHemma)
  const tb = parseInt(tipBorta)
  const rh = parseInt(resultatHemma)
  const rb = parseInt(resultatBorta)

  if (
    Number.isNaN(th) || Number.isNaN(tb) ||
    Number.isNaN(rh) || Number.isNaN(rb)
  ) return 0

  if (th === rh && tb === rb) return 5

  const tipUtgång      = th > tb ? 'hemma' : th < tb ? 'borta' : 'oavgjort'
  const resultatUtgång = rh > rb ? 'hemma' : rh < rb ? 'borta' : 'oavgjort'
  return tipUtgång === resultatUtgång ? 2 : 0
}

// ── Lookup-byggare ──────────────────────────────────────────────────────────
// Resultat-arket: A=match_id, B=hemma_mål, C=borta_mål (D kan finnas men ignoreras)
export function byggResultatMap(resultatRader = []) {
  const map = {}
  resultatRader.forEach((rad) => {
    if (rad && rad[0] && rad[1] !== '' && rad[1] != null && rad[2] !== '' && rad[2] != null) {
      map[rad[0]] = { hemma: Number(rad[1]), borta: Number(rad[2]) }
    }
  })
  return map
}

/**
 * Tips-arket är append-baserat: en användare kan ha redigerat sitt tips för
 * samma match flera gånger, vilket kan ge FLERA rader för samma (user_id,
 * match_id). Vid poängräkning och visning ska BARA det senaste tipset räknas —
 * dvs den sista raden i ark-ordning (senare rad = senare sparad). Annars
 * dubbelräknas matcher (samma match dyker upp flera gånger med poäng).
 *
 * @param {Array[]} tipsRader  Tips-rader: A=tip_id, B=user_id, C=match_id, D=hemma, E=borta
 * @returns {Array[]} en rad per (user_id, match_id) — den sista förekomsten
 */
export function dedupliceraTips(tipsRader = []) {
  const senaste = new Map()
  for (const rad of tipsRader) {
    const user_id  = rad && rad[1]
    const match_id = rad && rad[2]
    if (!user_id || !match_id) continue
    // Senare rad skriver över tidigare → sista förekomsten vinner
    senaste.set(`${user_id}|${match_id}`, rad)
  }
  return [...senaste.values()]
}

/**
 * Samma som [[dedupliceraTips]] men för FrågorSvar-arket: behåll bara senaste
 * svaret per (user_id, fråga_id). FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar.
 * Annars dubbelräknas frågepoäng om arket innehåller flera rader för samma svar.
 *
 * @param {Array[]} svarRader
 * @returns {Array[]} en rad per (user_id, fråga_id) — den sista förekomsten
 */
export function dedupliceraSvar(svarRader = []) {
  const senaste = new Map()
  for (const rad of svarRader) {
    const user_id  = rad && rad[1]
    const fråga_id = rad && rad[2]
    if (!user_id || !fråga_id) continue
    senaste.set(`${user_id}|${fråga_id}`, rad)
  }
  return [...senaste.values()]
}

// Användare-arket: A=user_id, B=namn
export function byggAnvändarMap(användareRader = []) {
  const map = {}
  användareRader.forEach((rad) => { if (rad && rad[0]) map[rad[0]] = rad[1] })
  return map
}

// Frågor-arket: A=id, C(idx 2)=poäng, E(idx 4)=rätt_svar
export function byggFrågorMap(frågorRader = []) {
  const map = {}
  frågorRader.forEach((rad) => {
    if (!rad || !rad[0]) return
    const rättSvar = (rad[4] || '').trim()
    if (rättSvar) {
      map[rad[0]] = {
        poäng:     parseInt(rad[2]) || 0,
        rätt_svar: rättSvar.toLowerCase(),
      }
    }
  })
  return map
}

/**
 * Per-användare-poäng över en uppsättning matcher.
 *
 * @param {Array[]} tipsRader      Tips-rader: A=tip_id, B=user_id, C=match_id, D=hemma, E=borta
 * @param {Object}  resultatMap    match_id → { hemma, borta }
 * @param {Set?}    matchFilter    Om angiven: räkna bara matcher i denna mängd
 * @returns {Object} user_id → { poäng, exakta, rätta }
 */
export function beräknaMatchpoängPerAnvändare(tipsRader = [], resultatMap = {}, matchFilter = null) {
  const ut = {}
  // Räkna bara senaste tipset per (user, match) — annars dubbelräknas matcher
  // när Tips-arket innehåller flera rader för samma tips. Se [[dedupliceraTips]].
  dedupliceraTips(tipsRader).forEach((rad) => {
    const user_id  = rad && rad[1]
    const match_id = rad && rad[2]
    if (!user_id || !match_id) return
    if (matchFilter && !matchFilter.has(match_id)) return
    const res = resultatMap[match_id]
    if (!res) return
    const p = räknaMatchPoäng(rad[3], rad[4], res.hemma, res.borta)
    if (!ut[user_id]) ut[user_id] = { poäng: 0, exakta: 0, rätta: 0 }
    ut[user_id].poäng += p
    if (p === 5) ut[user_id].exakta += 1
    if (p === 2) ut[user_id].rätta  += 1
  })
  return ut
}

/**
 * Komplett topplista inkl. tilläggsfrågor.
 * Detta är samma resultat som gamla scores.js producerade.
 *
 * @returns {Array} sorterad lista: { user_id, namn, poäng, exakta, rätta, frågepoäng, plats }
 */
export function beräknaTopplista({
  resultatRader = [],
  tipsRader = [],
  frågorRader = [],
  frågorSvarRader = [],
  användareRader = [],
} = {}) {
  const resultatMap  = byggResultatMap(resultatRader)
  const frågorMap    = byggFrågorMap(frågorRader)
  const användarMap  = byggAnvändarMap(användareRader)

  const poängMap = {}
  const init = (id) => {
    if (!poängMap[id]) poängMap[id] = { poäng: 0, exakta: 0, rätta: 0, frågepoäng: 0 }
  }

  // Matchpoäng
  const perAnv = beräknaMatchpoängPerAnvändare(tipsRader, resultatMap)
  Object.entries(perAnv).forEach(([user_id, s]) => {
    init(user_id)
    poängMap[user_id].poäng  += s.poäng
    poängMap[user_id].exakta += s.exakta
    poängMap[user_id].rätta  += s.rätta
  })

  // Frågepoäng. FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar
  // Dedupe: bara senaste svaret per (user, fråga) — annars dubbelräknas
  // frågepoäng när arket har flera rader för samma svar. Se [[dedupliceraSvar]].
  dedupliceraSvar(frågorSvarRader).forEach((rad) => {
    const user_id = rad && rad[1]
    const svar    = rad && rad[3]?.trim().toLowerCase()
    const fråga   = frågorMap[rad && rad[2]]
    if (!fråga || !svar || svar !== fråga.rätt_svar) return
    init(user_id)
    poängMap[user_id].poäng      += fråga.poäng
    poängMap[user_id].frågepoäng += fråga.poäng
  })

  return Object.entries(poängMap)
    .map(([user_id, stats]) => ({
      user_id,
      namn:       användarMap[user_id] || 'Okänd',
      poäng:      stats.poäng,
      exakta:     stats.exakta,
      rätta:      stats.rätta,
      frågepoäng: stats.frågepoäng,
    }))
    .sort((a, b) => b.poäng - a.poäng || b.exakta - a.exakta || a.namn.localeCompare(b.namn))
    .map((rad, index) => ({ ...rad, plats: index + 1 }))
}

/**
 * "Bäst igår" — topp N baserat på matchpoäng för matcher vars match_id finns
 * i igårMatchIds OCH har ett känt resultat. Tilläggsfrågor exkluderas.
 *
 * @returns {Array} topp N: { user_id, namn, poäng, exakta, rätta }
 */
export function beräknaIgår({
  igårMatchIds,
  resultatRader = [],
  tipsRader = [],
  användareRader = [],
  antal = 3,
} = {}) {
  const filter = igårMatchIds instanceof Set ? igårMatchIds : new Set(igårMatchIds || [])
  if (filter.size === 0) return []

  // Begränsa resultatMap till igårs matcher
  const fullResultat = byggResultatMap(resultatRader)
  const resultatMap = {}
  for (const id of filter) if (fullResultat[id]) resultatMap[id] = fullResultat[id]
  if (Object.keys(resultatMap).length === 0) return []

  const användarMap = byggAnvändarMap(användareRader)
  const perAnv = beräknaMatchpoängPerAnvändare(tipsRader, resultatMap, filter)

  return Object.entries(perAnv)
    .filter(([, s]) => s.poäng > 0)
    .sort((a, b) => b[1].poäng - a[1].poäng || b[1].exakta - a[1].exakta)
    .slice(0, antal)
    .map(([user_id, s]) => ({
      user_id,
      namn:   användarMap[user_id] || 'Okänd',
      poäng:  s.poäng,
      exakta: s.exakta,
      rätta:  s.rätta,
    }))
}

/**
 * Parsar "HH:MM UTC±N" (Matcher-arkets tid-kolumn) → UTC Date för matchstart.
 */
export function parseMatchStart(datum, tid) {
  if (!datum || !tid) return null
  const m = String(tid).match(/(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i)
  if (!m) return null
  const h = parseInt(m[1]), min = parseInt(m[2]), offset = parseFloat(m[3])
  const d = new Date(`${datum}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setTime(d.getTime() - offset * 3600000) // → UTC
  return d
}

/**
 * Bygger mängden match_id för matcher i "igår-fönstret":
 * igår 16:00 CEST (= 14:00 UTC) → idag 08:00 CEST (= 06:00 UTC).
 * Matcher-arket: A=match_id, B=datum, C=tid.
 */
export function byggIgårMatchIds(matcherRader = [], now = new Date()) {
  const fönsterStart = new Date(now); fönsterStart.setUTCDate(fönsterStart.getUTCDate() - 1); fönsterStart.setUTCHours(14, 0, 0, 0)
  const fönsterSlut  = new Date(now); fönsterSlut.setUTCHours(6, 0, 0, 0)
  return new Set(
    matcherRader
      .filter((r) => { const s = parseMatchStart(r[1], r[2]); return s && s >= fönsterStart && s < fönsterSlut })
      .map((r) => r[0])
      .filter(Boolean),
  )
}

/**
 * Poäng per enskilt tips — för att skriva tillbaka en poängkolumn på Tips-arket.
 * Returnerar en array i SAMMA ordning som tipsRader; värdet är poängen (number)
 * om matchen har ett resultat, annars '' (tomt → matchen ej spelad/klar än).
 */
export function beräknaTipsPoäng(tipsRader = [], resultatMap = {}) {
  return tipsRader.map((rad) => {
    const match_id = rad && rad[2]
    const res = match_id ? resultatMap[match_id] : null
    if (!res) return ''
    return räknaMatchPoäng(rad[3], rad[4], res.hemma, res.borta)
  })
}
