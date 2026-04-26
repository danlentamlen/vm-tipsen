// Netlify Scheduled Function — kör var 15:e minut under VM
// Hämtar slutresultat från football-data.org och sparar till Resultat-sheetet
//
// Miljövariabler som krävs:
//   FOOTBALL_DATA_KEY   — API-nyckel från football-data.org
//   GOOGLE_SHEET_ID     — Google Sheets ID
//   GOOGLE_CREDENTIALS  — Google service account JSON

import { getSheets, getRows } from './_sheets.js'

// VM 2026 competition ID på football-data.org
const COMPETITION_ID = 'WC'
const SEASON = '2026'
const API_BASE = 'https://api.football-data.org/v4'

// Lagnamn-mapping: football-data.org → openfootball/vårt format
const LAGNAMN_MAP = {
  // Vanliga skillnader
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  'IR Iran': 'Iran',
  'Czechia': 'Czech Republic',
  'Türkiye': 'Turkey',
  "Côte d'Ivoire": 'Ivory Coast',
  'China PR': 'China',
  // Lägg till fler vid behov
}

function normalisera(namn) {
  return (LAGNAMN_MAP[namn] || namn)?.trim().toLowerCase()
}

async function hämtaFrånAPI(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_KEY,
    },
  })
  if (!res.ok) {
    throw new Error(`API-fel ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export default async () => {
  if (!process.env.FOOTBALL_DATA_KEY) {
    console.error('[sync-results] FOOTBALL_DATA_KEY saknas')
    return
  }

  try {
    const sheets = await getSheets()

    // Hämta våra matcher från Sheets (för att bygga en match_id-lookup)
    const matcherRader = await getRows(sheets, 'Matcher!A2:H1000')
    if (matcherRader.length === 0) {
      console.log('[sync-results] Inga matcher i sheetet ännu')
      return
    }

    // Bygg lookup: "hemmalag_bortalag" → match_id
    const matchLookup = {}
    matcherRader.forEach((rad) => {
      const match_id = rad[0]
      const hemma = normalisera(rad[3])
      const borta = normalisera(rad[4])
      if (match_id && hemma && borta) {
        matchLookup[`${hemma}_${borta}`] = match_id
      }
    })

    // Hämta befintliga resultat för att undvika onödiga skrivningar
    const befintligaRader = await getRows(sheets, 'Resultat!A2:C1000')
    const befintligaResultat = new Set(befintligaRader.map((r) => r[0]))

    // Hämta avslutade matcher från football-data.org
    let data
    try {
      data = await hämtaFrånAPI(`/competitions/${COMPETITION_ID}/matches?season=${SEASON}&status=FINISHED`)
    } catch (err) {
      console.error('[sync-results] Kunde inte hämta från API:', err.message)
      return
    }

    const avslutadeMatcher = data.matches || []
    console.log(`[sync-results] ${avslutadeMatcher.length} avslutade matcher från API`)

    if (avslutadeMatcher.length === 0) {
      console.log('[sync-results] Inga avslutade matcher ännu')
      return
    }

    // Matcha och förbered uppdateringar
    const nyttaResultat = []
    let matchade = 0
    let omatchade = 0

    for (const match of avslutadeMatcher) {
      // Vi använder resultatet efter ordinarie tid (FT), inte straffar
      const hemma_mål = match.score?.fullTime?.home
      const borta_mål = match.score?.fullTime?.away

      if (hemma_mål === null || hemma_mål === undefined ||
          borta_mål === null || borta_mål === undefined) continue

      const hemmaLag = normalisera(match.homeTeam?.name || match.homeTeam?.shortName)
      const bortaLag = normalisera(match.awayTeam?.name || match.awayTeam?.shortName)

      // Prova olika kombinationer för matchning
      const nyckel = `${hemmaLag}_${bortaLag}`
      const match_id = matchLookup[nyckel]

      if (!match_id) {
        console.warn(`[sync-results] Hittade ingen match för: ${match.homeTeam?.name} vs ${match.awayTeam?.name} (nyckel: ${nyckel})`)
        omatchade++
        continue
      }

      matchade++

      // Hoppa över om resultatet redan finns
      if (befintligaResultat.has(match_id)) continue

      nyttaResultat.push({ match_id, hemma_mål, borta_mål })
    }

    console.log(`[sync-results] ${matchade} matchade, ${omatchade} omatchade, ${nyttaResultat.length} nya att spara`)

    if (nyttaResultat.length === 0) {
      console.log('[sync-results] Inga nya resultat att spara')
      return
    }

    // Skriv nya resultat till Resultat-sheetet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Resultat!A:C',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: nyttaResultat.map(({ match_id, hemma_mål, borta_mål }) => [
          match_id,
          String(hemma_mål),
          String(borta_mål),
        ]),
      },
    })

    console.log(`[sync-results] ✅ Sparade ${nyttaResultat.length} nya resultat`)

  } catch (err) {
    console.error('[sync-results] FEL:', err)
  }
}