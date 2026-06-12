/**
 * scores-yesterday.js — "Bäst igår" (startsidan)
 *
 * Snabb väg: läser den förberäknade listan som sync-results skriver
 * (persistent cache 'yesterday:v1'). Ingen Tips-scan vid sidladdning.
 *
 * Fallback (om snapshot saknas): räkna live med delade _scoring-funktioner.
 *
 * Returnerar topp 3 baserat på matchpoäng för matcher i fönstret
 * igår 16:00 CEST → idag 08:00 CEST. Tilläggsfrågor exkluderas.
 */
import { getSheets, getMultipleRanges } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'
import { getCached } from './_persistentCache.js'
import { getMatcher, getAnvändare } from './_lockedData.js'
import { byggIgårMatchIds, beräknaIgår } from './_scoring.js'

const CACHE_TTL = 10 * 60 * 1000

async function räknaLive() {
  const sheets = await getSheets()
  const matcherRader = await getMatcher()
  const igårIds = byggIgårMatchIds(matcherRader, new Date())
  if (igårIds.size === 0) return []

  const [resultatRader, tipsRader] = await getMultipleRanges(sheets, [
    'Resultat!A2:C1000',
    'Tips!A2:E100000',
  ])
  const användareRader = await getAnvändare()
  return beräknaIgår({ igårMatchIds: igårIds, resultatRader, tipsRader, användareRader, antal: 3 })
}

export default async () => {
  if (!gruppspelLåst()) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // dateKey gör att fönstret nollställs vid dygnsskifte även om sync dröjer
    const dateKey = new Date().toISOString().slice(0, 10)
    const lista = await getCached(`yesterday:v1:${dateKey}`, CACHE_TTL, räknaLive)

    return new Response(JSON.stringify(lista), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (err) {
    console.error('[scores-yesterday] FEL:', err)
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
