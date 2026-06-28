/**
 * admin-cache.js
 *
 * Tvingar omläsning av locked-snapshot-cache (Användare, Viner, Frågor, FrågorSvar)
 * och räknar därefter om topplistan direkt — utan att vänta på skrivpausen i sync-results.
 *
 * Används när t.ex. rätt_svar uppdaterats i Frågor-sheetet och frågepoäng
 * behöver slå igenom i topplistan omedelbart.
 *
 * POST /api/admin-cache
 *
 * Auth: Bearer <ADMIN_SECRET> krävs.
 */
import { getSheets, getRows, ensureSheet, overwriteRange } from './_sheets.js'
import { refreshLockedSnapshot } from './_lockedData.js'
import { beräknaTopplista } from './_scoring.js'
import { setCached } from './_persistentCache.js'

const TOPPLISTA_HEADER = ['user_id', 'namn', 'poäng', 'exakta', 'rätta', 'frågepoäng', 'plats', 'uppdaterad']

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (!verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Ej behörig' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Töm cache och läs om Frågor, FrågorSvar, Användare, Viner från Sheets
    const { användare, frågor, frågorSvar, viner } = await refreshLockedSnapshot()

    // 2. Hämta aktuella resultat och tips
    const sheets = await getSheets()
    const [resultatRader, tipsRader] = await Promise.all([
      getRows(sheets, 'Resultat!A2:C1000'),
      getRows(sheets, 'Tips!A2:E100000'),
    ])

    // 3. Räkna om topplistan med färsk data
    const standings = beräknaTopplista({
      resultatRader,
      tipsRader,
      frågorRader:    frågor,
      frågorSvarRader: frågorSvar,
      användareRader: användare,
      vinerRader:     viner,
    })

    // 4. Skriv till Topplista-arket + persistent cache
    const uppdaterad = new Date().toISOString()
    await ensureSheet(sheets, 'Topplista')
    await overwriteRange(sheets, 'Topplista', [
      TOPPLISTA_HEADER,
      ...standings.map((r) => [
        r.user_id, r.namn, r.poäng, r.exakta, r.rätta, r.frågepoäng, r.plats, uppdaterad,
      ]),
    ])
    await setCached('standings:v1', standings)

    return new Response(
      JSON.stringify({
        message: `Cache tömd och topplista omräknad. ${standings.length} deltagare uppdaterade.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-cache] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
