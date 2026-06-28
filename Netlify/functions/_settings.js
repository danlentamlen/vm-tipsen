import { getSheets, getRows } from './_sheets.js'

export async function getSettings() {
  const sheets = await getSheets()
  const rader = await getRows(sheets, 'Inställningar!A2:B100')
  const settings = {}
  rader.forEach((rad) => {
    if (rad[0]) settings[rad[0].trim()] = rad[1]?.trim() || ''
  })
  return settings
}

export async function setSetting(nyckel, värde) {
  const sheets = await getSheets()
  const rader = await getRows(sheets, 'Inställningar!A2:B100')
  const index = rader.findIndex((rad) => rad[0] === nyckel)
  if (index !== -1) {
    const radNummer = index + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Inställningar!B${radNummer}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[värde]] },
    })
  }
}

// Deadline för gruppspelstips: 11 juni 2026 kl 16:00 svensk tid (CEST)
export const GRUPPSPEL_DEADLINE = new Date('2026-06-11T19:00:00+02:00')

/**
 * Returnerar true om gruppspelet är låst (klockan har passerat deadline)
 */
export function gruppspelLåst() {
  return new Date() >= GRUPPSPEL_DEADLINE
}

// Slutspelsomgångar som låses per omgång (inte individuellt)
export const SLUTSPELS_OMGÅNGAR = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

// Vilken omgång som "låser upp" nästa — dvs tippning för omgång N öppnas
// så snart FÖRSTA matchen i föregående omgång har ett känt resultat.
const FÖREGÅENDE_OMGÅNG = {
  'Round of 16':        'Round of 32',
  'Quarter-final':      'Round of 16',
  'Semi-final':         'Quarter-final',
  'Final':              'Semi-final',
  'Match for third place': 'Semi-final',
}

/**
 * Räknar ut om en match är låst baserat på klockan och kända resultat:
 * - Gruppspel:   låst om nu >= GRUPPSPEL_DEADLINE
 * - Round of 32: öppnar direkt när gruppspelet låsts, låser 2h innan start
 * - R16 och senare: öppnar så snart FÖRSTA matchen från föregående omgång
 *                   har ett resultat i Resultat-arket, låser 2h innan start
 *
 * @param {object}   match        - { match_id, datum, tid, omgång, grupp }
 * @param {object[]} allaMatcher  - alla matcher (för tidsberäkningar)
 * @param {Array[]}  resultatRader - rader från Resultat-arket (A=match_id, ...)
 * @returns {boolean}
 */
export function ärMatchLåst(match, allaMatcher, resultatRader = []) {
  const nu = new Date()

  // Tilläggsfrågor och gruppspel: enbart tidsbaserat
  if (!match.omgång || !SLUTSPELS_OMGÅNGAR.includes(match.omgång)) {
    return nu >= GRUPPSPEL_DEADLINE
  }

  // Slutspelsmatch — alltid låst tills gruppspelet är låst
  if (!gruppspelLåst()) return true

  // Lås 2h innan omgångens första match (gäller alla slutspelsomgångar)
  const omgångsMatcher = allaMatcher.filter((m) => m.omgång === match.omgång)
  const sorterade = omgångsMatcher
    .map((m) => ({ ...m, startTid: parseMatchTid(m.datum, m.tid) }))
    .filter((m) => m.startTid !== null)
    .sort((a, b) => a.startTid - b.startTid)

  if (sorterade.length > 0) {
    const lockDeadline = new Date(sorterade[0].startTid.getTime() - 2 * 60 * 60 * 1000)
    if (nu >= lockDeadline) return true
  }

  // Round of 32 öppnar direkt när gruppspelet låsts (ingen föregående omgång)
  if (match.omgång === 'Round of 32') return false

  // Övriga omgångar: öppna så snart minst ETT resultat från föregående omgång finns
  const föregående = FÖREGÅENDE_OMGÅNG[match.omgång]
  if (!föregående) return false

  const föregåendeIds = new Set(
    allaMatcher.filter((m) => m.omgång === föregående).map((m) => m.match_id),
  )
  const harResultat = resultatRader.some((r) => r[0] && föregåendeIds.has(r[0]))
  return !harResultat
}

/**
 * Parsar datum (YYYY-MM-DD) + tid (HH:MM) till ett Date-objekt i svensk tid (CEST = UTC+2)
 */
export function parseMatchTid(datum, tid) {
  if (!datum) return null
  try {
    const tidRaw = (tid || '00:00').trim()

    // Extrahera HH:MM-delen
    const tidStr = tidRaw.split(' ')[0].trim()

    // Extrahera UTC-offset om den finns, t.ex. "UTC-4" → "-04:00", "UTC+2" → "+02:00"
    const utcMatch = tidRaw.match(/UTC([+-]\d+)/i)
    let offset = '+02:00' // default: CEST (svensk sommartid)

    if (utcMatch) {
      const timmar = parseInt(utcMatch[1])
      const abs = Math.abs(timmar).toString().padStart(2, '0')
      offset = timmar >= 0 ? `+${abs}:00` : `-${abs}:00`
    }

    const iso = `${datum}T${tidStr}:00${offset}`
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/**
 * Returnerar en map: match_id -> boolean (låst eller ej)
 * Används av settings.js endpoint för att skicka till frontend.
 *
 * @param {object[]} allaMatcher  - alla matcher
 * @param {Array[]}  resultatRader - rader från Resultat-arket (A=match_id)
 */
export function byggLåsMap(allaMatcher, resultatRader = []) {
  const map = {}
  allaMatcher.forEach((m) => {
    map[m.match_id] = ärMatchLåst(m, allaMatcher, resultatRader)
  })
  return map
}
