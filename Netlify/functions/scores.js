import { getSheets, getRows } from './_sheets.js'

// Kolumnstruktur i Frågor-sheetet:
// A = fråga_id
// B = fråga (svenska)
// C = poäng
// D = typ        (t.ex. "team", "number", "choice:Ja/Nej")
// E = rätt_svar
// F = fråga_en
// G = typ_en

function räknaMatchPoäng(tipHemma, tipBorta, resultatHemma, resultatBorta) {
  const th = parseInt(tipHemma)
  const tb = parseInt(tipBorta)
  const rh = parseInt(resultatHemma)
  const rb = parseInt(resultatBorta)

  if (isNaN(th) || isNaN(tb) || isNaN(rh) || isNaN(rb)) return 0
  if (th === rh && tb === rb) return 5

  const tipUtgång      = th > tb ? 'hemma' : th < tb ? 'borta' : 'oavgjort'
  const resultatUtgång = rh > rb ? 'hemma' : rh < rb ? 'borta' : 'oavgjort'
  if (tipUtgång === resultatUtgång) return 2

  return 0
}

export default async (req) => {
  try {
    const sheets = await getSheets()

    // Hämta matchresultat
    const resultatRader = await getRows(sheets, 'Resultat!A2:D1000')
    const resultatMap = {}
    resultatRader.forEach((rad) => {
      if (rad[0] && rad[1] !== '' && rad[2] !== '') {
        resultatMap[rad[0]] = { hemma_mål: rad[1], borta_mål: rad[2] }
      }
    })

    // Hämta alla tips
    const tipsRader = await getRows(sheets, 'Tips!A2:E100000')

    // Hämta frågor — rätt_svar finns nu i kolumn E (index 4)
    const frågor = await getRows(sheets, 'Frågor!A2:E1000')
    const frågorMap = {}
    frågor.forEach((rad) => {
      if (!rad[0]) return
      const rättSvar = (rad[4] || '').trim() // kolumn E
      if (rättSvar) {
        frågorMap[rad[0]] = {
          poäng:      parseInt(rad[2]) || 0,
          rätt_svar:  rättSvar.toLowerCase(),
        }
      }
    })

    // Hämta frågesvar
    const frågorSvarRader = await getRows(sheets, 'FrågorSvar!A2:D100000')

    // Hämta användare
    const användareRader = await getRows(sheets, 'Användare!A2:B1000')
    const användareMap = {}
    användareRader.forEach((rad) => {
      if (rad[0]) användareMap[rad[0]] = rad[1]
    })

    // Räkna poäng per användare
    const poängMap = {}

    function initAnvändare(user_id) {
      if (!poängMap[user_id]) {
        poängMap[user_id] = { poäng: 0, exakta: 0, rätta: 0, frågepoäng: 0 }
      }
    }

    // Matchpoäng
    tipsRader.forEach((rad) => {
      const user_id  = rad[1]
      const match_id = rad[2]
      const resultat = resultatMap[match_id]
      if (!resultat) return

      initAnvändare(user_id)
      const poäng = räknaMatchPoäng(rad[3], rad[4], resultat.hemma_mål, resultat.borta_mål)
      poängMap[user_id].poäng += poäng
      if (poäng === 5) poängMap[user_id].exakta += 1
      if (poäng === 2) poängMap[user_id].rätta  += 1
    })

    // Frågepoäng — svar lagras alltid på svenska, rätt_svar i sheetet är också på svenska
    frågorSvarRader.forEach((rad) => {
      const user_id  = rad[1]
      const fråga_id = rad[2]
      const svar     = rad[3]?.trim().toLowerCase()
      const fråga    = frågorMap[fråga_id]

      if (!fråga || !svar) return
      if (svar !== fråga.rätt_svar) return

      initAnvändare(user_id)
      poängMap[user_id].poäng      += fråga.poäng
      poängMap[user_id].frågepoäng += fråga.poäng
    })

    // Bygg topplistan
    const topplista = Object.entries(poängMap)
      .map(([user_id, stats]) => ({
        user_id,
        namn:        användareMap[user_id] || 'Okänd',
        poäng:       stats.poäng,
        exakta:      stats.exakta,
        rätta:       stats.rätta,
        frågepoäng:  stats.frågepoäng,
      }))
      .sort((a, b) => b.poäng - a.poäng)
      .map((rad, index) => ({ ...rad, plats: index + 1 }))

    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[scores] FEL:', err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}