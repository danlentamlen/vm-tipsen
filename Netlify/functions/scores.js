/**
 * scores.js — Topplistan (startsidan + /topplista)
 *
 * Snabb väg: läser den FÖRBERÄKNADE topplistan som sync-results skriver
 * (persistent cache 'standings:v1', durabelt backat av Topplista-arket).
 * Ingen full Tips-scan sker här längre → snabb sidladdning.
 *
 * Fallback (om snapshot saknas, t.ex. före första sync efter deploy):
 * räkna live från råa ark med den delade _scoring-modulen. Identiskt resultat.
 */
import { getSheets, getRows, getMultipleRanges } from './_sheets.js'
import { getCached } from './_persistentCache.js'
import { getLockedSnapshot } from './_lockedData.js'
import { beräknaTopplista } from './_scoring.js'

// Writern (sync-results) är "klockan": den skriver standings:v1 till Blobs var
// 5:e minut. Läsvägen ska bara spegla det senaste writern skrev, inte ha en egen
// längre timer som får sidan att släpa efter. Därför kort TTL (60 s) — räcker för
// att dämpa burst-trafik mot Blobs men gör att sidan följer writern tätt.
// Billigt: standings läses från Blobs, inte Sheets (Sheets-fallback bara om
// snapshoten saknas helt, t.ex. före första synken efter en deploy).
const CACHE_TTL = 60 * 1000 // 60 s

// Läs förberäknad topplista från Topplista-arket (A2:H)
async function läsSnapshotSheet(sheets) {
  let rader = []
  try {
    rader = await getRows(sheets, 'Topplista!A2:H10000')
  } catch {
    return [] // arket finns inte ännu
  }
  return rader
    .filter((r) => r[0])
    .map((r) => ({
      user_id:    r[0],
      namn:       r[1] || 'Okänd',
      poäng:      Number(r[2]) || 0,
      exakta:     Number(r[3]) || 0,
      rätta:      Number(r[4]) || 0,
      frågepoäng: Number(r[5]) || 0,
      plats:      Number(r[6]) || 0,
    }))
}

// Fallback: räkna live från råa ark
async function räknaLive(sheets) {
  const [resultatRader, tipsRader] = await getMultipleRanges(sheets, [
    'Resultat!A2:D1000',
    'Tips!A2:E100000',
  ])
  const { användare, frågor, frågorSvar } = await getLockedSnapshot()
  return beräknaTopplista({
    resultatRader,
    tipsRader,
    frågorRader: frågor,
    frågorSvarRader: frågorSvar,
    användareRader: användare,
  })
}

export default async () => {
  try {
    const topplista = await getCached('standings:v1', CACHE_TTL, async () => {
      const sheets = await getSheets()
      const snap = await läsSnapshotSheet(sheets)
      return snap.length ? snap : räknaLive(sheets)
    })

    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    console.error('[scores] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
