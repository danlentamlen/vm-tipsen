import { getSheets, getRows } from './_sheets.js'

/**
 * finallagen.js — deltagarnas tippade finallag
 *
 * Returnerar { [user_id]: { vinnare, förlorare } } där:
 *   vinnare   = svar på "Vem vinner VM?"        (team-fråga med "vinner" i texten)
 *   förlorare = svar på "Vem förlorar finalen?" (team-fråga med "förlorar" i texten)
 *
 * Kolumnstruktur:
 *   Frågor:     A=fråga_id, B=fråga (sv), C=poäng, D=typ, E=rätt_svar
 *   FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar
 *
 * OBS säkerhet: frontenden avslöjar bara detta när tipsen är låsta (tips_låst),
 * samma mönster som Deltagare-sidan → ingen kan kopiera andras finaltips i förväg.
 */
/**
 * Klassar team-frågorna som vinnare/förlorare (via frågetext, med ordning som
 * fallback) och bygger { [user_id]: { vinnare, förlorare } }.
 * Ren funktion → enhetstestbar utan Sheets.
 *
 * @param {Array[]} frågorRader  A=id, B=fråga (sv), C=poäng, D=typ
 * @param {Array[]} svarRader    A=id, B=user_id, C=fråga_id, D=svar
 */
export function byggFinallagMap(frågorRader = [], svarRader = []) {
  let vinnareFrågaId   = null
  let förlorareFrågaId = null
  frågorRader.forEach((rad) => {
    const id   = rad[0]
    const text = (rad[1] || '').toLowerCase()
    const typ  = (rad[3] || '').trim()
    if (typ !== 'team' || !id) return
    if (text.includes('förlorar') || text.includes('forlorar')) {
      if (!förlorareFrågaId) förlorareFrågaId = id
    } else if (text.includes('vinner')) {
      if (!vinnareFrågaId) vinnareFrågaId = id
    }
  })

  // Fallback: om texten inte matchar (t.ex. äldre data) — ta team-frågorna i
  // ordning: första = vinnare, andra = förlorare.
  if (!vinnareFrågaId || !förlorareFrågaId) {
    const teamIds = frågorRader
      .filter((rad) => (rad[3] || '').trim() === 'team' && rad[0])
      .map((rad) => rad[0])
    if (!vinnareFrågaId)   vinnareFrågaId   = teamIds[0] || null
    if (!förlorareFrågaId) förlorareFrågaId = teamIds.find((id) => id !== vinnareFrågaId) || null
  }

  const map = {}
  if (!vinnareFrågaId && !förlorareFrågaId) return map

  svarRader.forEach((rad) => {
    const user_id  = rad[1]
    const fråga_id = rad[2]
    const svar     = rad[3]
    if (!user_id || !svar) return
    if (fråga_id !== vinnareFrågaId && fråga_id !== förlorareFrågaId) return
    if (!map[user_id]) map[user_id] = { vinnare: null, förlorare: null }
    if (fråga_id === vinnareFrågaId   && !map[user_id].vinnare)   map[user_id].vinnare   = svar
    if (fråga_id === förlorareFrågaId && !map[user_id].förlorare) map[user_id].förlorare = svar
  })

  return map
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const sheets = await getSheets()
    // Läs samma vida range som övrig kod (100000) annars tappas svar för
    // deltagare längre ner i arket.
    const [frågor, svarRader] = await Promise.all([
      getRows(sheets, 'Frågor!A2:D1000'),
      getRows(sheets, 'FrågorSvar!A2:D100000'),
    ])

    const map = byggFinallagMap(frågor, svarRader)

    return new Response(JSON.stringify(map), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    console.error('[finallagen] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
