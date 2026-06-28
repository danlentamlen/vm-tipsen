import { google } from 'googleapis'

export const SHEET_ID = process.env.GOOGLE_SHEET_ID

// ── Auth client cache ──────────────────────────────────────────────────────
// Google OAuth tokens last 1 hour. Cache the authenticated sheets client for
// 55 min so warm requests skip the auth round-trip entirely.
let _sheetsClient = null
let _sheetsClientExpiry = 0

export async function getSheets() {
  if (_sheetsClient && Date.now() < _sheetsClientExpiry) {
    return _sheetsClient
  }
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const client = await auth.getClient()
  _sheetsClient = google.sheets({ version: 'v4', auth: client })
  _sheetsClientExpiry = Date.now() + 55 * 60 * 1000
  return _sheetsClient
}

// ── Single-range read ──────────────────────────────────────────────────────
export async function getRows(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })
  return res.data.values || []
}

// ── Multi-range read (one API call instead of N) ───────────────────────────
// Returns an array of row-arrays in the same order as the input ranges.
//
// Example:
//   const [resultat, tips, users] = await getMultipleRanges(sheets, [
//     'Resultat!A2:D1000',
//     'Tips!A2:E100000',
//     'Användare!A2:B1000',
//   ])
export async function getMultipleRanges(sheets, ranges) {
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID,
    ranges,
  })
  return (res.data.valueRanges || []).map(vr => vr.values || [])
}

// ── Write helpers ──────────────────────────────────────────────────────────
export async function appendRow(sheets, range, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

// ── Snapshot helpers ───────────────────────────────────────────────────────
// Säkerställer att en flik (sheet/tab) finns. Skapar den annars. Returnerar
// true om fliken redan fanns, false om den nyss skapades.
export async function ensureSheet(sheets, title) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  })
  const finns = (meta.data.sheets || []).some(
    (s) => s.properties?.title === title
  )
  if (finns) return true
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
  return false
}

// Skriver om ett helt intervall (rensar gammalt innehåll först). Används för
// förberäknade snapshots där hela tabellen ska ersättas.
export async function overwriteRange(sheets, sheetTitle, values) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${sheetTitle}!A:Z`,
  })
  if (values.length === 0) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetTitle}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  })
}

// ── Radborttagning ─────────────────────────────────────────────────────────
// Tar bort specifika rader (0-baserade sheetsindexar) från ett sheet.
// rowIndexes = nollbaserade radsiffror inom sheetet (0 = rubrikrad).
// Sorterar fallande automatiskt så överstående raderingar inte förskjuter.
export async function deleteRows(sheets, sheetId, rowIndexes) {
  if (rowIndexes.length === 0) return
  const sorted = [...new Set(rowIndexes)].sort((a, b) => b - a)
  const requests = sorted.map((idx) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: idx,
        endIndex: idx + 1,
      },
    },
  }))
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  })
}

// Hämtar numeriska sheet-id:n (behövs för batchUpdate).
// Returnerar ett objekt { 'Tips': 123, 'FrågorSvar': 456, ... }
export async function getSheetIds(sheets) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties',
  })
  const ids = {}
  for (const s of meta.data.sheets || []) {
    ids[s.properties.title] = s.properties.sheetId
  }
  return ids
}

// Skriver en enda kolumn (t.ex. matchpoäng på Tips) i ett anrop.
export async function writeColumn(sheets, range, columnValues) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: columnValues.map((v) => [v]) },
  })
}