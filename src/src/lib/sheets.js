import { google } from 'googleapis'
import credentials from '../../google-credentials.json'

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export async function getSheets() {
  const client = await auth.getClient()
  return google.sheets({ version: 'v4', auth: client })
}

export const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID