import fetch from 'node-fetch'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const SHEET_ID = process.env.GOOGLE_SHEET_ID

async function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const client = await auth.getClient()
  return google.sheets({ version: 'v4', auth: client })
}

async function seedMatches() {
  console.log('Hämtar matchdata från openfootball...')

  const res = await fetch(
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
  )
  const data = await res.json()

  const matcher = data.matches.map((match, index) => [
    `match_${String(index + 1).padStart(3, '0')}`,  // match_id
    match.date,                                       // datum
    match.time || '',                                 // tid
    match.team1,                                      // hemmalag
    match.team2,                                      // bortalag
    match.group || 'Slutspel',                        // grupp
    match.round,                                      // omgång
    match.ground || '',                               // arena
  ])

  console.log(`Hittade ${matcher.length} matcher`)

  const sheets = await getSheets()

  // Rensa befintlig data först (behåll rubrikraden)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: 'Matcher!A2:H1000',
  })

  // Skriv in alla matcher
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Matcher!A2',
    valueInputOption: 'RAW',
    requestBody: { values: matcher },
  })

  console.log(`✅ ${matcher.length} matcher inlagda i Google Sheets!`)
}

seedMatches().catch(console.error)