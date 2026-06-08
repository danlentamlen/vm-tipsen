import { getSheets } from './_sheets.js'

/**
 * Scheduled function — runs daily at 13:00 UTC (15:00 CEST)
 * Fetches odds from The Odds API, converts to implied probabilities,
 * and writes the result to the "Odds" sheet as a persistent cache.
 *
 * Uses ~1 API call per day → well within the 500/month free tier limit.
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const SPORT        = 'soccer_fifa_world_cup'

/**
 * Convert decimal odds to normalized implied probabilities (removes bookmaker margin).
 * Returns an array in the same order as the input outcomes.
 */
function impliedProbabilities(outcomes) {
  const raw   = outcomes.map(o => 1 / o.price)
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map(p => p / total)
}

export default async () => {
  try {
    const apiKey = process.env.ODDS_API_KEY
    if (!apiKey) {
      console.error('[odds-fetch] ODDS_API_KEY saknas i miljövariabler')
      return
    }

    const res = await fetch(
      `${ODDS_API_BASE}/sports/${SPORT}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`
    )

    if (!res.ok) {
      console.error(`[odds-fetch] The Odds API svarade ${res.status}: ${await res.text()}`)
      return
    }

    const matches  = await res.json()
    const remaining = res.headers.get('x-requests-remaining') ?? '?'
    console.log(`[odds-fetch] ${remaining} anrop kvar denna månad`)

    // Process each match — average odds across all bookmakers, then normalize
    const processed = matches.map(match => {
      const bookmakers = match.bookmakers || []
      if (bookmakers.length === 0) return null

      // Gather all prices per outcome name across bookmakers
      const priceMap = {}
      bookmakers.forEach(bm => {
        const h2h = bm.markets?.find(m => m.key === 'h2h')
        if (!h2h) return
        h2h.outcomes.forEach(o => {
          if (!priceMap[o.name]) priceMap[o.name] = []
          priceMap[o.name].push(o.price)
        })
      })

      // Average price per outcome
      const avgOutcomes = Object.entries(priceMap).map(([name, prices]) => ({
        name,
        price: prices.reduce((a, b) => a + b, 0) / prices.length,
      }))

      if (avgOutcomes.length < 3) return null

      const probs    = impliedProbabilities(avgOutcomes)
      const homeIdx  = avgOutcomes.findIndex(o => o.name === match.home_team)
      const awayIdx  = avgOutcomes.findIndex(o => o.name === match.away_team)
      const drawIdx  = avgOutcomes.findIndex(o => o.name === 'Draw')

      if (homeIdx === -1 || awayIdx === -1 || drawIdx === -1) return null

      return {
        id:            match.id,
        home_team:     match.home_team,
        away_team:     match.away_team,
        commence_time: match.commence_time,
        home_prob:     Math.round(probs[homeIdx] * 100),
        draw_prob:     Math.round(probs[drawIdx] * 100),
        away_prob:     Math.round(probs[awayIdx] * 100),
      }
    }).filter(Boolean)

    // Persist to Google Sheets (Odds!A2:C2 — single row, overwritten each run)
    const sheets = await getSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range:         'Odds!A2:C2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          new Date().toISOString(),    // A: timestamp
          JSON.stringify(processed),   // B: odds data as JSON
          remaining,                   // C: API calls remaining (for monitoring)
        ]],
      },
    })

    console.log(`[odds-fetch] Sparade odds för ${processed.length} matcher. ${remaining} anrop kvar.`)
  } catch (err) {
    console.error('[odds-fetch] FEL:', err)
  }
}
