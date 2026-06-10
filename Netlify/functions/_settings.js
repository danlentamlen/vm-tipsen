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
export const GRUPPSPEL_DEADLINE = new Date('2026-06-11T16:00:00+02:00')

/**
 * Returnerar true om gruppspelet är låst (klockan har passerat deadline)
 */
export function gruppspelLåst() {
  return new Date() >= GRUPPSPEL_DEADLINE
}

// Slutspelsomgångar som låses per omgång (inte individuellt)
const SLUTSPELS_OMGÅNGAR = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

/**
 * Räknar ut om en match är låst baserat på klockan:
 * - Gruppspel: låst om nu >= GRUPPSPEL_DEADLINE
 * - Slutspel:  låst om nu >= (första matchens starttid i omgången) - 4 timmar
 *
 * @param {object} match - { match_id, datum, tid, omgång, grupp }
 * @param {object[]} allaMatcher - alla matcher (för att hitta första i omgången)
 * @returns {boolean}
 */
export function ärMatchLåst(match, allaMatcher) {
  const nu = new Date()

  // Tilläggsfrågor och gruppspel: enbart tidsbaserat
  if (!match.omgång || !SLUTSPELS_OMGÅNGAR.includes(match.omgång)) {
    return nu >= GRUPPSPEL_DEADLINE
  }

  // Slutspelsmatch — låst tills gruppspelet är låst
  if (!gruppspelLåst()) return true

  // Hitta första matchen i omgången och lås 4h innan
  const omgångsMatcher = allaMatcher.filter((m) => m.omgång === match.omgång)
  if (omgångsMatcher.length === 0) return false

  const sorterade = omgångsMatcher
    .map((m) => ({ ...m, startTid: parseMatchTid(m.datum, m.tid) }))
    .filter((m) => m.startTid !== null)
    .sort((a, b) => a.startTid - b.startTid)

  if (sorterade.length === 0) return false

  const förstaMatch = sorterade[0].startTid
  const deadline = new Date(förstaMatch.getTime() - 4 * 60 * 60 * 1000) // -4 timmar

  return nu >= deadline
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
 * Används av settings.js endpoint för att skicka till frontend
 */
export function byggLåsMap(allaMatcher) {
  const map = {}
  allaMatcher.forEach((m) => {
    map[m.match_id] = ärMatchLåst(m, allaMatcher)
  })
  return map
}
