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
import { getLiveScores, getFinishedResults, filtreraEjLive, nyligenAvslutade, matchKey } from './_resultsSource.js'
import { getMatcher } from './_lockedData.js'

const CACHE_TTL = 30 * 1000 // 30 s — live ska vara färskt men inte spamma API:t

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!process.env.FOOTBALL_DATA_KEY && !process.env.THESPORTSDB_LEAGUE) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const live = await getCached('live-scores:v1', CACHE_TTL, async () => {
      const [pågående, avslutade, matcherRader] = await Promise.all([
        getLiveScores(),
        getFinishedResults().catch(() => []), // tål att fela → bara live visas då
        getMatcher().catch(() => []), // Matcher för tidsspärr → tål att fela
      ])
      // Tidsspärr: släng matcher som varit "live" orimligt länge efter avspark
      // (zombie-live när alla källor släpar efter slutsignal). Se filtreraEjLive.
      const liveLista = filtreraEjLive(pågående, matcherRader).map((m) => ({
        hemmalag: m.hemmalag,
        bortalag: m.bortalag,
        hemma:    m.hemma,
        borta:    m.borta,
        minut:    m.minut ?? null,
        status:   m.status,
      }))
      // Nyss avslutade → låt kortet visa slutställningen DIREKT från live-källan
      // utan att vänta på ark-skrivningen (skrivpaus/5-min-schema). En match som
      // redan är live filtreras inte med här (den ligger i liveLista).
      const liveNycklar = new Set(liveLista.map((m) => matchKey(m.hemmalag, m.bortalag)))
      const slutLista = nyligenAvslutade(avslutade, matcherRader)
        .filter((m) => !liveNycklar.has(matchKey(m.hemmalag, m.bortalag)))
        .map((m) => ({
          hemmalag: m.hemmalag,
          bortalag: m.bortalag,
          hemma:    m.hemma,
          borta:    m.borta,
          minut:    null,
          status:   'FINISHED',
        }))
      return [...liveLista, ...slutLista]
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
