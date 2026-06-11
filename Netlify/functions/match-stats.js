import { getSheets, getMultipleRanges } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'
import { withCache } from './_cache.js'

const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

/**
 * GET /.netlify/functions/match-stats
 *
 * Returns per-match tip distribution and accuracy stats.
 * Only accessible after the group stage deadline (gruppspelLåst).
 *
 * Response shape:
 *   {
 *     [match_id]: {
 *       totalt: number,
 *       hemma_pct: number,   // % who tipped home win
 *       draw_pct: number,    // % who tipped draw
 *       borta_pct: number,   // % who tipped away win
 *       // Only present when result is known:
 *       resultat_hemma: number,
 *       resultat_borta: number,
 *       exakt: number,        // count exact correct
 *       rätt_vinnare: number, // count correct outcome but wrong score
 *       fel: number,          // count wrong outcome
 *     }
 *   }
 */
export default async (req) => {
  if (!gruppspelLåst()) {
    return new Response(
      JSON.stringify({ error: 'Statistik visas efter tipsdealinen' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const stats = await withCache('match-stats', CACHE_TTL, async () => {
    const sheets = await getSheets()

    const [tipsRader, resultatRader] = await getMultipleRanges(sheets, [
      'Tips!A2:E100000',
      'Resultat!A2:C1000',
    ])

    // Build result map: match_id → { hemma, borta }
    const resultat = {}
    resultatRader.forEach((rad) => {
      if (rad[0]) resultat[rad[0]] = { hemma: Number(rad[1]), borta: Number(rad[2]) }
    })

    // Group tips by match_id
    const tipsByMatch = {}
    tipsRader.forEach((rad) => {
      const match_id = rad[2]
      if (!match_id) return
      if (!tipsByMatch[match_id]) tipsByMatch[match_id] = []
      tipsByMatch[match_id].push({ hemma: Number(rad[3]), borta: Number(rad[4]) })
    })

    // Build stats per match
    const stats = {}
    Object.entries(tipsByMatch).forEach(([match_id, tips]) => {
      const totalt = tips.length
      if (totalt === 0) return

      const res = resultat[match_id]

      let hemmaVinst = 0, oavgjort = 0, bortaVinst = 0
      let exakt = 0, rätt_vinnare = 0, fel = 0

      tips.forEach((tip) => {
        // Distribution
        if (tip.hemma > tip.borta)       hemmaVinst++
        else if (tip.hemma === tip.borta) oavgjort++
        else                              bortaVinst++

        // Accuracy — only when result is available
        if (res !== undefined) {
          if (tip.hemma === res.hemma && tip.borta === res.borta) {
            exakt++
          } else if (
            (tip.hemma > tip.borta  && res.hemma > res.borta)  ||
            (tip.hemma === tip.borta && res.hemma === res.borta) ||
            (tip.hemma < tip.borta  && res.hemma < res.borta)
          ) {
            rätt_vinnare++
          } else {
            fel++
          }
        }
      })

      // Score frequency — top 4 most tipped exact scores
      const scoreFreq = {}
      tips.forEach((tip) => {
        const key = `${tip.hemma}-${tip.borta}`
        scoreFreq[key] = (scoreFreq[key] || 0) + 1
      })
      const populäraste = Object.entries(scoreFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key, count]) => {
          const [hemma, borta] = key.split('-').map(Number)
          return { hemma, borta, count }
        })

      stats[match_id] = {
        totalt,
        hemma_pct: Math.round((hemmaVinst / totalt) * 100),
        draw_pct:  Math.round((oavgjort   / totalt) * 100),
        borta_pct: Math.round((bortaVinst / totalt) * 100),
        populäraste,
        ...(res !== undefined
          ? { exakt, rätt_vinnare, fel, resultat_hemma: res.hemma, resultat_borta: res.borta }
          : {}),
      }
    })

    return stats
    }) // end withCache

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=180', // 3 minutes
      },
    })
  } catch (err) {
    console.error('[match-stats] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
