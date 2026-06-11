import { getSheets, getMultipleRanges } from './_sheets.js'
import { withCache } from './_cache.js'

const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

function räknaMatchPoäng(tipHemma, tipBorta, resultatHemma, resultatBorta) {
  const th = parseInt(tipHemma)
  const tb = parseInt(tipBorta)
  const rh = parseInt(resultatHemma)
  const rb = parseInt(resultatBorta)

  if (isNaN(th) || isNaN(tb) || isNaN(rh) || isNaN(rb)) return 0
  if (th === rh && tb === rb) return 5

  const tipUtgång      = th > tb ? 'hemma' : th < tb ? 'borta' : 'oavgjort'
  const resultatUtgång = rh > rb ? 'hemma' : rh < rb ? 'borta' : 'oavgjort'
  return tipUtgång === resultatUtgång ? 2 : 0
}

async function beräknaTopplista() {
  const sheets = await getSheets()

  // One batchGet instead of 5 sequential API calls
  const [resultatRader, tipsRader, frågorRader, frågorSvarRader, användareRader] =
    await getMultipleRanges(sheets, [
      'Resultat!A2:D1000',
      'Tips!A2:E100000',
      'Frågor!A2:E1000',
      'FrågorSvar!A2:D100000',
      'Användare!A2:B1000',
    ])

  const resultatMap = {}
  resultatRader.forEach((rad) => {
    if (rad[0] && rad[1] !== '' && rad[2] !== '') {
      resultatMap[rad[0]] = { hemma_mål: rad[1], borta_mål: rad[2] }
    }
  })

  const frågorMap = {}
  frågorRader.forEach((rad) => {
    if (!rad[0]) return
    const rättSvar = (rad[4] || '').trim()
    if (rättSvar) {
      frågorMap[rad[0]] = {
        poäng:     parseInt(rad[2]) || 0,
        rätt_svar: rättSvar.toLowerCase(),
      }
    }
  })

  const användareMap = {}
  användareRader.forEach((rad) => { if (rad[0]) användareMap[rad[0]] = rad[1] })

  const poängMap = {}
  const init = (id) => { if (!poängMap[id]) poängMap[id] = { poäng: 0, exakta: 0, rätta: 0, frågepoäng: 0 } }

  tipsRader.forEach((rad) => {
    const user_id  = rad[1]
    const resultat = resultatMap[rad[2]]
    if (!resultat) return
    init(user_id)
    const p = räknaMatchPoäng(rad[3], rad[4], resultat.hemma_mål, resultat.borta_mål)
    poängMap[user_id].poäng += p
    if (p === 5) poängMap[user_id].exakta += 1
    if (p === 2) poängMap[user_id].rätta  += 1
  })

  frågorSvarRader.forEach((rad) => {
    const user_id = rad[1]
    const svar    = rad[3]?.trim().toLowerCase()
    const fråga   = frågorMap[rad[2]]
    if (!fråga || !svar || svar !== fråga.rätt_svar) return
    init(user_id)
    poängMap[user_id].poäng      += fråga.poäng
    poängMap[user_id].frågepoäng += fråga.poäng
  })

  return Object.entries(poängMap)
    .map(([user_id, stats]) => ({
      user_id,
      namn:       användareMap[user_id] || 'Okänd',
      poäng:      stats.poäng,
      exakta:     stats.exakta,
      rätta:      stats.rätta,
      frågepoäng: stats.frågepoäng,
    }))
    .sort((a, b) => b.poäng - a.poäng)
    .map((rad, index) => ({ ...rad, plats: index + 1 }))
}

export default async (req) => {
  try {
    const topplista = await withCache('scores', CACHE_TTL, beräknaTopplista)
    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120', // 2 min browser cache
      },
    })
  } catch (err) {
    console.error('[scores] FEL:', err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}