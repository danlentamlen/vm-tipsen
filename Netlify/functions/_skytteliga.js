/**
 * _skytteliga.js — Ren, testbar logik för skytteligan.
 *
 * FIFA-regel (Adidas Golden Boot): flest mål vinner. Vid lika antal mål
 * avgörs placeringen på flest assists. Vi tillämpar detta explicit i stället
 * för att lita på extern sorteringsordning.
 *
 * Modulen är avsiktligt fri från nätverk/Sheets — de anropas i respektive
 * funktion och matas hit som data, så att logiken kan enhetstestas isolerat.
 */

/**
 * Normaliserar ett spelarnamn för matchning mellan det manuella Skytteliga-arket
 * och football-data (som kan stava med/utan diakriter, extra mellanslag osv.).
 *   "Kylian Mbappé" → "kylian mbappe"
 */
export function normaliseraNamn(namn) {
  if (!namn) return ''
  return String(namn)
    .normalize('NFD')                 // dela isär bokstav + diakrit
    .replace(/[\u0300-\u036f]/g, '')  // ta bort diakriter (NFD-kombinationstecken)
    .toLowerCase()
    .replace(/[.\-']/g, ' ')          // punkter/bindestreck/apostrof → mellanslag
    .replace(/\s+/g, ' ')             // kollapsa mellanslag
    .trim()
}

/** Sista ordet i ett normaliserat namn (efternamn) — används som fallback-nyckel. */
function efternamn(normNamn) {
  const delar = normNamn.split(' ').filter(Boolean)
  return delar.length ? delar[delar.length - 1] : ''
}

/**
 * Bygger en uppslagskarta normaliseratNamn → assists från football-datas
 * scorers-svar. Lägger även in en efternamns-nyckel som fallback, men BARA när
 * efternamnet är entydigt (annars riskerar vi felmatcha två olika spelare).
 *
 * @param {Array<{player?:{name?:string}, assists?:number}>} fdScorers
 * @returns {Map<string, number>}
 */
export function byggAssistkarta(fdScorers = []) {
  const full = new Map()
  const efterRäknare = new Map()   // efternamn → antal spelare
  const efterAssist  = new Map()   // efternamn → assists (om entydigt)

  for (const s of fdScorers) {
    const namn = normaliseraNamn(s?.player?.name)
    if (!namn) continue
    const assists = Number.isFinite(s?.assists) ? s.assists : 0
    // Fullt namn vinner alltid — behåll högsta assist-värdet vid dubblett.
    full.set(namn, Math.max(full.get(namn) ?? 0, assists))

    const efter = efternamn(namn)
    if (efter) {
      efterRäknare.set(efter, (efterRäknare.get(efter) ?? 0) + 1)
      efterAssist.set(efter, assists)
    }
  }

  // Slå bara ihop entydiga efternamn till fallback-kartan.
  const fallback = new Map()
  for (const [efter, antal] of efterRäknare) {
    if (antal === 1) fallback.set(efter, efterAssist.get(efter))
  }

  return { full, fallback }
}

/**
 * Slår upp assists för en spelare: exakt fullnamn först, annars entydigt
 * efternamn. Returnerar 0 om ingen träff (så tiebreak degraderar snällt).
 */
export function slåUppAssists(spelarnamn, karta) {
  if (!karta) return 0
  const norm = normaliseraNamn(spelarnamn)
  if (karta.full?.has(norm)) return karta.full.get(norm)
  const efter = efternamn(norm)
  if (efter && karta.fallback?.has(efter)) return karta.fallback.get(efter)
  return 0
}

/**
 * FIFA-sortering: mål fallande, därefter assists fallande. Stabil ordning för
 * övrigt (bevarar inbördes ordning vid exakt lika mål+assists).
 */
export function sorteraFifa(lista = []) {
  return [...lista].sort((a, b) => {
    const mål = (b.mål ?? 0) - (a.mål ?? 0)
    if (mål !== 0) return mål
    return (b.assists ?? 0) - (a.assists ?? 0)
  })
}

/** Tolkar ett heltal ur en cell; returnerar null om tom/ogiltig. */
function parseAssistCell(v) {
  if (v === '' || v === undefined || v === null) return null
  const n = parseInt(v)
  return Number.isFinite(n) ? n : null
}

/**
 * För Home-widgeten (manuella arket): kombinerar arkets mål med assists,
 * sorterar enligt FIFA och plockar topp N.
 *
 * Assist-källa i prioritetsordning:
 *   1. Arkets kolumn D (manuellt ifylld) — sanningskälla, du styr den själv.
 *   2. football-data (assistKarta) — reserv när D är tom.
 *   3. 0 — degraderar till mål-only.
 *
 * @param {Array[]} sheetRader   Skytteliga!A2:D — [spelare, land, mål, assists?]
 * @param {{full:Map,fallback:Map}} assistKarta  från byggAssistkarta()
 * @param {number} topp          antal att returnera (default 5)
 */
export function byggWidgetSkytteliga(sheetRader = [], assistKarta = null, topp = 5) {
  return sorteraFifa(
    sheetRader
      .filter((r) => r[0] && r[2] !== '' && r[2] !== undefined)
      .map((r) => {
        const arketsAssist = parseAssistCell(r[3])
        return {
          spelare: r[0].trim(),
          land:    (r[1] || '').trim(),
          mål:     parseInt(r[2]) || 0,
          assists: arketsAssist != null ? arketsAssist : slåUppAssists(r[0], assistKarta),
        }
      })
      .filter((s) => s.mål > 0),
  ).slice(0, topp)
}

/**
 * För Skytteliga-sidan (football-data): mappar råsvaret, tillämpar FIFA-sort
 * och sätter plats sekventiellt efter sorteringen.
 */
export function rankaFdScorers(rawScorers = []) {
  const mappade = (rawScorers || []).map((s) => ({
    namn:    s?.player?.name || '–',
    lag:     s?.team?.name || '–',
    mål:     s?.goals ?? 0,
    assists: s?.assists ?? 0,
    matcher: s?.playedMatches ?? 0,
  }))
  return sorteraFifa(mappade).map((s, i) => ({ plats: i + 1, ...s }))
}
