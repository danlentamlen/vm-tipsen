import { getSheets, getRows } from './_sheets.js'
import { byggUtslagnaLag } from './_scoring.js'

/**
 * finallagen.js — deltagarnas tippade finallag
 *
 * Returnerar { [user_id]: { vinnare, förlorare, vinnareUt, förlorareUt } } där:
 *   vinnare     = svar på "Vem vinner VM?"        (team-fråga med "vinner" i texten)
 *   förlorare   = svar på "Vem förlorar finalen?" (team-fråga med "förlorar" i texten)
 *   vinnareUt   = true om det tippade laget redan är utslaget ur turneringen
 *   förlorareUt = true om det tippade laget redan är utslaget ur turneringen
 *
 * Kolumnstruktur:
 *   Frågor:     A=fråga_id, B=fråga (sv), C=poäng, D=typ, E=rätt_svar, …, H=fel_svar
 *   FrågorSvar: A=id, B=user_id, C=fråga_id, D=svar
 *
 * "Utslaget" speglar EXAKT samma regel som bettingöversikten (_scoring.js):
 * ett lag är rött om det (a) är utslaget enligt Matcher/Resultat (byggUtslagnaLag)
 * ELLER (b) är manuellt fel-markerat i Frågor kolumn H (fel_svar) för sin fråga.
 * Ett lag som är rätt facit (kolumn E) markeras aldrig rött.
 *
 * OBS säkerhet: frontenden avslöjar bara detta när tipsen är låsta (tips_låst),
 * samma mönster som Deltagare-sidan → ingen kan kopiera andras finaltips i förväg.
 */
// Semikolon-separerad cell → Set av trimmade gemener.
function toLowerSet(cell) {
  return new Set(
    String(cell || '').split(';').map((s) => s.trim().toLowerCase()).filter(Boolean),
  )
}

/**
 * Klassar team-frågorna som vinnare/förlorare (via frågetext, med ordning som
 * fallback) och bygger { [user_id]: { vinnare, förlorare, vinnareUt, förlorareUt } }.
 * Ren funktion → enhetstestbar utan Sheets.
 *
 * @param {Array[]} frågorRader  A=id, B=fråga (sv), C=poäng, D=typ, E=rätt_svar, H=fel_svar
 * @param {Array[]} svarRader    A=id, B=user_id, C=fråga_id, D=svar
 * @param {Set<string>} utslagnaLag  lagnamn i gemener (från byggUtslagnaLag)
 */
export function byggFinallagMap(frågorRader = [], svarRader = [], utslagnaLag = new Set()) {
  let vinnareFråga   = null
  let förlorareFråga = null
  frågorRader.forEach((rad) => {
    const id   = rad[0]
    const text = (rad[1] || '').toLowerCase()
    const typ  = (rad[3] || '').trim()
    if (typ !== 'team' || !id) return
    if (text.includes('förlorar') || text.includes('forlorar')) {
      if (!förlorareFråga) förlorareFråga = rad
    } else if (text.includes('vinner')) {
      if (!vinnareFråga) vinnareFråga = rad
    }
  })

  // Fallback: om texten inte matchar (t.ex. äldre data) — ta team-frågorna i
  // ordning: första = vinnare, andra = förlorare.
  if (!vinnareFråga || !förlorareFråga) {
    const teamRader = frågorRader.filter((rad) => (rad[3] || '').trim() === 'team' && rad[0])
    if (!vinnareFråga)   vinnareFråga   = teamRader[0] || null
    if (!förlorareFråga) förlorareFråga = teamRader.find((rad) => rad !== vinnareFråga) || null
  }

  const map = {}
  const vinnareFrågaId   = vinnareFråga ? vinnareFråga[0] : null
  const förlorareFrågaId = förlorareFråga ? förlorareFråga[0] : null
  if (!vinnareFrågaId && !förlorareFrågaId) return map

  // Per fråga: manuellt fel-markerade lag (kolumn H) och facit (kolumn E).
  const felSvarVinnare   = toLowerSet(vinnareFråga && vinnareFråga[7])
  const felSvarFörlorare = toLowerSet(förlorareFråga && förlorareFråga[7])
  const facitVinnare     = toLowerSet(vinnareFråga && vinnareFråga[4])
  const facitFörlorare   = toLowerSet(förlorareFråga && förlorareFråga[4])

  // Uträknad = INTE rätt facit OCH (utslaget lag ELLER manuellt fel-markerat).
  const ärUt = (lag, felSvar, facit) => {
    if (!lag) return false
    const n = String(lag).trim().toLowerCase()
    if (facit.has(n)) return false
    return utslagnaLag.has(n) || felSvar.has(n)
  }

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

  // Markera utslagna/uträknade lag (för röd färg i UI:t).
  Object.values(map).forEach((rad) => {
    rad.vinnareUt   = ärUt(rad.vinnare, felSvarVinnare, facitVinnare)
    rad.förlorareUt = ärUt(rad.förlorare, felSvarFörlorare, facitFörlorare)
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
    // deltagare längre ner i arket. Matcher + Resultat → utslagna lag.
    const [frågor, svarRader, matcherRader, resultatRader] = await Promise.all([
      getRows(sheets, 'Frågor!A2:H1000'), // H = fel_svar (manuell fel-markering)
      getRows(sheets, 'FrågorSvar!A2:D100000'),
      getRows(sheets, 'Matcher!A2:G1000'),
      getRows(sheets, 'Resultat!A2:C1000'),
    ])

    const utslagnaLag = byggUtslagnaLag(matcherRader, resultatRader)
    const map = byggFinallagMap(frågor, svarRader, utslagnaLag)

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
