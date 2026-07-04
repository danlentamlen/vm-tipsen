/**
 * bet-overview.js — Publik bettingöversikt (läs-endpoint)
 *
 * GET /.netlify/functions/bet-overview
 *
 * Returnerar i ETT anrop:
 *   - matcher: gruppspelsmatcher med full fördelning av alla tippade resultat
 *     (procent) + ev. resultat (då markeras rätt resultat i fördelningen).
 *   - frågor:  tilläggsfrågor med full svarsfördelning + ev. rätt svar.
 *
 * All aggregering sker i den rena funktionen byggBettingöversikt (_scoring.js),
 * så att den är enhetstestbar och delar dedupliceringslogik med topplistan.
 *
 * Cache: persistent 5 min (delas mellan instanser via Blobs) — samma mönster som
 * match-stats. Tung läsning (hela Tips-arket) görs alltså bara vid cache-miss.
 *
 * SÄKERHET: visas bara när tipsen är låsta (gruppspelLåst) — annars läcker vi
 * andras tips innan deadline. Facit (resultat/rätt svar) avslöjas bara när det
 * finns ifyllt; det styrs i den rena funktionen.
 */
import { getSheets, getMultipleRanges } from './_sheets.js'
import { getMatcher } from './_lockedData.js'
import { gruppspelLåst, getSettings } from './_settings.js'
import { getCached } from './_persistentCache.js'
import { byggBettingöversikt, parseSnabbasteMål } from './_scoring.js'

const CACHE_TTL = 5 * 60 * 1000 // 5 min

export default async () => {
  if (!gruppspelLåst()) {
    return new Response(
      JSON.stringify({ error: 'Översikten visas efter tipsdeadline', låst: true }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const data = await getCached('bet-overview:v2', CACHE_TTL, async () => {
      const sheets = await getSheets()
      const matcherRader = await getMatcher() // låst ark, cachat
      const [tipsRader, resultatRader, frågorRader, frågorSvarRader] =
        await getMultipleRanges(sheets, [
          'Tips!A2:E100000',
          'Resultat!A2:C1000',
          'Frågor!A2:H1000', // H = fel_svar (manuell fel-markering)
          'FrågorSvar!A2:D100000',
        ])
      const översikt = byggBettingöversikt({ matcherRader, tipsRader, resultatRader, frågorRader, frågorSvarRader })
      // Nuvarande snabbaste mål (minuter) — sätts av admin i Inställningar-arket
      // som raden "snabbaste_målet". Används för att markera uträknade tips.
      const settings = await getSettings()
      return { ...översikt, snabbasteMål: parseSnabbasteMål(settings['snabbaste_målet']) }
    })

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=180', // 3 min
      },
    })
  } catch (err) {
    console.error('[bet-overview] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
