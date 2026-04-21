import { google } from 'googleapis'

export const SHEET_ID = process.env.GOOGLE_SHEET_ID

export async function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const client = await auth.getClient()
  return google.sheets({ version: 'v4', auth: client })
}

export async function appendRow(sheets, range, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function getRows(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })
  return res.data.values || []
}