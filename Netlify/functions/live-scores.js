/**
 * live-scores.js — Pågående matcher för startsidans "Live".
 *
 * Använder den sammanslagna resultatkällan (_resultsSource): football-data.org
 * som primär + valfri gratis sekundärkälla (TheSportsDB) som snabbare alternativ.
 * Den källa som rapporterar IN_PLAY/PAUSED vinner. Trasig källa väller aldrig
 * den andra (Promise.allSettled internt).
 *
 * Output (oförändrad form): [{ hemmalag, bortalag, hemma, borta, minut, status }]
 */
import { getCached } from './_persistentCache.js'
import { getLiveScores, filtreraEjLive } from './_resultsSource.js'
import { getMatcher } from './_lockedData.js'

const CACHE_TTL = 30 * 1000 // 30 s — live ska vara färskt men inte spamma API:t

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!process.env.FOOTBALL_DATA_KEY && !process.env.THESPORTSDB_LEAGUE && !process.env.BALLDONTLIE_KEY) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const live = await getCached('live-scores:v1', CACHE_TTL, async () => {
      const [pågående, matcherRader] = await Promise.all([
        getLiveScores(),
        getMatcher().catch(() => []), // Matcher endast för tidsspärr → tål att fela
      ])
      // Tidsspärr: släng matcher som varit "live" orimligt länge efter avspark
      // (zombie-live när alla källor släpar efter slutsignal). Se filtreraEjLive.
      return filtreraEjLive(pågående, matcherRader).map((m) => ({
        hemmalag: m.hemmalag,
        bortalag: m.bortalag,
        hemma:    m.hemma,
        borta:    m.borta,
        minut:    m.minut ?? null,
        status:   m.status,
      }))
    })

    return new Response(JSON.stringify(live), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    })
  } catch (err) {
    console.error('[live-scores] FEL:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
