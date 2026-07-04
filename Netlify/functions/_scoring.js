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
// rätt_svar kan vara semikolonseparerat för att stödja flera godkända svar,
// t.ex. "Germany; Netherlands" om två lag delar förstaplatsen.
export function byggFrågorMap(frågorRader = []) {
  const map = {}
  frågorRader.forEach((rad) => {
    if (!rad || !rad[0]) return
    const rättSvar = (rad[4] || '').trim()
    if (rättSvar) {
      map[rad[0]] = {
        poäng:      parseInt(rad[2]) || 0,
        rätt_svar:  rättSvar.split(';').map((s) => s.trim().toLowerCase()).filter(Boolean),
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
  vinerRader = [],
} = {}) {
  const resultatMap  = byggResultatMap(resultatRader)
  const frågorMap    = byggFrågorMap(frågorRader)
  const användarMap  = byggAnvändarMap(användareRader)
  const vinprisMap   = byggVinprisMap(vinerRader)

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
    if (!fråga || !svar || !fråga.rätt_svar.includes(svar)) return
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
    // Rangordning vid lika poäng:
    //   1. Flest exakta (5-poängare)
    //   2. Dyrast vinflaska (vin_pris i Viner-arket)
    //   3. Namn (stabil sista utslagsgivare)
    .sort((a, b) =>
      b.poäng - a.poäng ||
      b.exakta - a.exakta ||
      (vinprisMap[b.user_id] || 0) - (vinprisMap[a.user_id] || 0) ||
      a.namn.localeCompare(b.namn))
    .map((rad, index) => ({ ...rad, plats: index + 1 }))
}

/**
 * Bygger user_id → vinpris (tal) från Viner-arket. Kolumner: A=user_id,
 * E(idx 4)=vin_pris. Priset lagras som text ("149 kr", "1 299,00 kr") så vi
 * plockar ut första talet och tolererar mellanslag som tusentalsavgränsare och
 * komma som decimaltecken. Saknat/otolkbart pris → 0 (rankas lägst).
 */
export function byggVinprisMap(vinerRader = []) {
  const map = {}
  for (const rad of vinerRader || []) {
    const id = rad && rad[0]
    if (!id) continue
    map[id] = parseVinPris(rad[4])
  }
  return map
}

/** Tolkar ett vinpris i textform till ett tal. "1 299,50 kr" → 1299.5, "" → 0. */
export function parseVinPris(text) {
  const m = String(text ?? '').replace(/\s/g, '').replace(',', '.').match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
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

// ── Snabbaste målet ──────────────────────────────────────────────────────────
/**
 * Tolkar Inställningar-värdet snabbaste_målet till minuter (tal).
 * Stödjer "2", "1,5" och "1:30" (min:sek). Ogiltigt/saknas → null.
 */
export function parseSnabbasteMål(värde) {
  const s = String(värde ?? '').trim()
  if (!s) return null
  const kolon = s.match(/^(\d+):([0-5]?\d)$/)
  if (kolon) return parseInt(kolon[1]) + parseInt(kolon[2]) / 60
  const tal = parseFloat(s.replace(',', '.'))
  return Number.isFinite(tal) ? tal : null
}

// ── Utslagna lag ─────────────────────────────────────────────────────────────
/**
 * Platshållarnamn i Matcher-arket (lag ej kända än): "1A", "3ABC", "W73", "L74".
 */
export const ärPlaceholder = (namn) =>
  !namn || /^[12][A-L]$/.test(namn) || /^3[A-L]/.test(namn) || /^[WL]\d+$/.test(namn)

// Bracket-ordning för utslagning (bronsmatchen hanteras separat — dess lag har
// redan förlorat semifinalen och kan varken vinna VM eller förlora finalen).
const BRACKET_ORDNING = [
  'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final',
]

/**
 * Härleder vilka lag som är UTSLAGNA ur turneringen, helt ur Matcher + Resultat:
 *
 *   1. Gruppspel: när Round of 32 är FULLT populerat med riktiga lagnamn är
 *      alla gruppspelslag som inte finns där utslagna. (Innan dess vet vi inte
 *      säkert vilka som går vidare → ingen markeras.)
 *   2. Slutspel: laget som förlorade på ORDINARIE TID är utslaget. Vid oavgjort
 *      (straffar — Resultat lagrar bara 90 min) avgörs det av vem som dykt upp
 *      i en senare omgång: har motståndaren gått vidare är laget utslaget,
 *      annars markeras ingen (säkert default tills syncen fyllt nästa omgång).
 *   3. Bronsmatchens lag är per definition utslagna (förlorade semin).
 *
 * Används för att markera omöjliga svar på lagfrågor (typ "team") i
 * bettingöversikten, t.ex. "Vem vinner VM?" och "Vem förlorar finalen?".
 *
 * @param {Array[]} matcherRader  A=match_id,B=datum,C=tid,D=hemma,E=borta,F=grupp,G=omgång
 * @param {Array[]} resultatRader A=match_id,B=hemma,C=borta
 * @returns {Set<string>} lagnamn i gemener
 */
export function byggUtslagnaLag(matcherRader = [], resultatRader = []) {
  const resultat = byggResultatMap(resultatRader)
  const utslagna = new Set()
  const norm = (s) => String(s || '').trim().toLowerCase()

  // Slutspelsmatcher med kända lag
  const slutspel = matcherRader.filter((rad) =>
    rad && rad[0] && rad[5] === 'Slutspel' && rad[6] &&
    !ärPlaceholder(rad[3]) && !ärPlaceholder(rad[4]))

  // 1. Gruppspelslag som inte finns i ett fullt populerat Round of 32
  const r32Alla = matcherRader.filter((rad) => rad && rad[5] === 'Slutspel' && rad[6] === 'Round of 32')
  const r32Fullt = r32Alla.length > 0 &&
    r32Alla.every((rad) => !ärPlaceholder(rad[3]) && !ärPlaceholder(rad[4]))
  if (r32Fullt) {
    const vidare = new Set(r32Alla.flatMap((rad) => [norm(rad[3]), norm(rad[4])]))
    matcherRader
      .filter((rad) => rad && rad[5] && rad[5] !== 'Slutspel')
      .forEach((rad) => {
        for (const lag of [rad[3], rad[4]]) {
          if (lag && !ärPlaceholder(lag) && !vidare.has(norm(lag))) utslagna.add(norm(lag))
        }
      })
  }

  // Djupaste omgång per lag (exkl. bronsmatch)
  const djupast = new Map() // lag → { rad, idx }
  for (const rad of slutspel) {
    const idx = BRACKET_ORDNING.indexOf(rad[6])
    if (idx === -1) continue
    for (const lag of [rad[3], rad[4]]) {
      const n = norm(lag)
      const nuvarande = djupast.get(n)
      if (!nuvarande || idx > nuvarande.idx) djupast.set(n, { rad, idx })
    }
  }

  // 2. Avgör per lag utifrån dess djupaste match
  for (const [lag, { rad, idx }] of djupast) {
    const res = resultat[rad[0]]
    if (!res) continue // ej spelad → kvar
    const ärHemma = norm(rad[3]) === lag
    const mina  = ärHemma ? res.hemma : res.borta
    const deras = ärHemma ? res.borta : res.hemma
    if (mina < deras) { utslagna.add(lag); continue }  // förlust på 90 min
    if (mina > deras) continue                          // vinst på 90 min → kvar
    // Oavgjort → avgjort på straffar: utslagen om motståndaren gått vidare
    const motståndare = djupast.get(norm(ärHemma ? rad[4] : rad[3]))
    if (motståndare && motståndare.idx > idx) utslagna.add(lag)
  }

  // 3. Bronsmatchens lag förlorade semin
  for (const rad of slutspel) {
    if (rad[6] === 'Match for third place') {
      utslagna.add(norm(rad[3]))
      utslagna.add(norm(rad[4]))
    }
  }

  return utslagna
}

// ── Bettingöversikt ──────────────────────────────────────────────────────────
/**
 * Bygger den publika bettingöversikten:
 *   - per GRUPPSPELS-match: full fördelning av alla tippade resultat (med %),
 *     och facit (ev. resultat) när det finns — då markeras rätt resultat.
 *   - per TILLÄGGSFRÅGA: full fördelning av alla svar (med %), och rätt svar
 *     när det finns — då markeras rätt svar.
 *
 * Ren funktion utan sidoeffekter → enhetstestbar (se tests/unit/betOverview.test.js).
 *
 * SÄKERHET: facit avslöjas BARA när det faktiskt är ifyllt i arket (admin har
 * matat in det = utgången är känd). Tom cell → rätt_svar/resultat = null och
 * inget markeras. Vi läcker alltså aldrig ett facit i förväg.
 *
 * Tips dedupliceras per (user_id, match_id) och svar per (user_id, fråga_id) så
 * att en användares redigerade tips bara räknas en gång (annars uppblåst %).
 *
 * @param {Object}  args
 * @param {Array[]} args.matcherRader    A=match_id,B=datum,C=tid,D=hemma,E=borta,F=grupp,G=omgång
 * @param {Array[]} args.tipsRader       A=tip_id,B=user_id,C=match_id,D=hemma,E=borta
 * @param {Array[]} args.resultatRader   A=match_id,B=hemma,C=borta
 * @param {Array[]} args.frågorRader     A=id,B=fråga,C=poäng,D=typ,E=rätt_svar,F=fråga_en,G=typ_en,H=fel_svar
 * @param {Array[]} args.frågorSvarRader A=id,B=user_id,C=fråga_id,D=svar
 * @returns {{matcher:Array,frågor:Array}}
 */
export function byggBettingöversikt({
  matcherRader = [], tipsRader = [], resultatRader = [],
  frågorRader = [], frågorSvarRader = [],
} = {}) {
  const resultat = byggResultatMap(resultatRader)

  // Tippade resultat per match (deduplicerat → senaste tipset per användare).
  const tipsPerMatch = {}
  dedupliceraTips(tipsRader).forEach((rad) => {
    const mid = rad[2]
    if (!tipsPerMatch[mid]) tipsPerMatch[mid] = []
    tipsPerMatch[mid].push(`${Number(rad[3])}-${Number(rad[4])}`)
  })

  // Alla matcher (gruppspel + slutspel) där match_id finns och lag är kända.
  // Matcher med platshållare (t.ex. "1A", "W73") hoppas över — de har inga tips.
  // (ärPlaceholder är modul-delad — används även av byggUtslagnaLag.)
  const matcher = matcherRader
    .filter((rad) => {
      if (!rad || !rad[0] || !rad[5]) return false
      // Hoppa över knockout-matcher där lagen ännu inte är kända
      if (rad[5] === 'Slutspel' && (ärPlaceholder(rad[3]) || ärPlaceholder(rad[4]))) return false
      return true
    })
    .map((rad) => {
      const match_id   = rad[0]
      const tips        = tipsPerMatch[match_id] || []
      const totalt      = tips.length
      const res          = resultat[match_id]
      const resultatStr = res ? `${res.hemma}-${res.borta}` : null

      const räknare = {}
      tips.forEach((k) => { räknare[k] = (räknare[k] || 0) + 1 })
      const fördelning = Object.entries(räknare)
        .map(([nyckel, antal]) => ({
          resultat: nyckel,
          antal,
          procent: totalt ? Math.round((antal / totalt) * 100) : 0,
          rätt: resultatStr != null && nyckel === resultatStr,
        }))
        .sort((a, b) => b.antal - a.antal || (a.resultat < b.resultat ? -1 : 1))

      return {
        match_id, datum: rad[1], tid: rad[2],
        hemmalag: rad[3], bortalag: rad[4], grupp: rad[5], omgång: rad[6] || null,
        totalt, resultat: resultatStr, fördelning,
      }
    })

  // Svar per fråga (deduplicerat → senaste svaret per användare).
  const svarPerFråga = {}
  dedupliceraSvar(frågorSvarRader).forEach((rad) => {
    const fid = rad[2]
    if (!svarPerFråga[fid]) svarPerFråga[fid] = []
    svarPerFråga[fid].push((String(rad[3] ?? '').trim()) || '–')
  })

  // Utslagna lag → svar på lagfrågor (typ "team") som inte längre kan bli rätt.
  const utslagnaLag = byggUtslagnaLag(matcherRader, resultatRader)

  const frågor = frågorRader
    .filter((rad) => rad && rad[0])
    .map((rad) => {
      const fråga_id = rad[0]
      const facit     = (rad[4] || '').trim() || null   // null tills admin fyllt i
      const typ        = ((rad[3] || '').split('|')[0] || 'text').split(':')[0]
      const svar       = svarPerFråga[fråga_id] || []
      const totalt     = svar.length

      // Manuellt fel-markerade svar (kolumn H, semikolonseparerat) — låter
      // admin bocka av svar som redan är omöjliga innan facit finns.
      const felSvar = new Set(
        (rad[7] || '').split(';').map((s) => s.trim().toLowerCase()).filter(Boolean),
      )

      const räknare = {}
      svar.forEach((s) => { räknare[s] = (räknare[s] || 0) + 1 })
      const fördelning = Object.entries(räknare)
        .map(([svarText, antal]) => {
          const nyckel = svarText.toLowerCase()
          const rätt = facit != null &&
            facit.split(';').map((s) => s.trim().toLowerCase()).includes(nyckel)
          // Uträknad = manuellt fel-markerad ELLER utslaget lag (lagfrågor).
          // Ett facit-rätt svar markeras aldrig som uträknat.
          const uträknad = !rätt && (
            felSvar.has(nyckel) || (typ === 'team' && utslagnaLag.has(nyckel))
          )
          return {
            svar: svarText,
            antal,
            procent: totalt ? Math.round((antal / totalt) * 100) : 0,
            rätt,
            uträknad,
          }
        })
        .sort((a, b) => b.antal - a.antal || (a.svar < b.svar ? -1 : 1))

      return {
        fråga_id,
        fråga:    rad[1] || '',
        fråga_en: (rad[5] || '').trim() || null,
        poäng:    parseInt(rad[2]) || 0,
        typ,
        rätt_svar: facit,
        totalt, fördelning,
      }
    })

  return { matcher, frågor }
}
