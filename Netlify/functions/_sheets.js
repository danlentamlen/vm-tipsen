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