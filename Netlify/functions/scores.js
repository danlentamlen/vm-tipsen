import { getSheets, getRows } from './_sheets.js'

function räknaPoäng(tipHemma, tipBorta, resultatHemma, resultatBorta) {
  const th = parseInt(tipHemma)
  const tb = parseInt(tipBorta)
  const rh = parseInt(resultatHemma)
  const rb = parseInt(resultatBorta)

  if (isNaN(th) || isNaN(tb) || isNaN(rh) || isNaN(rb)) return 0

  // Exakt rätt
  if (th === rh && tb === rb) return 5

  // Rätt utgång
  const tipUtgång = th > tb ? 'hemma' : th < tb ? 'borta' : 'oavgjort'
  const resultatUtgång = rh > rb ? 'hemma' : rh < rb ? 'borta' : 'oavgjort'

  if (tipUtgång === resultatUtgång) return 2

  return 0
}

export default async (req) => {
  try {
    const sheets = await getSheets()

    // Hämta alla resultat
    const resultatRader = await getRows(sheets, 'Resultat!A2:D1000')
    const resultatMap = {}
    resultatRader.forEach((rad) => {
      if (rad[0] && rad[1] !== '' && rad[2] !== '') {
        resultatMap[rad[0]] = {
          hemma_mål: rad[1],
          borta_mål: rad[2],
        }
      }
    })

    // Hämta alla tips
    const tipsRader = await getRows(sheets, 'Tips!A2:E1000')

    // Hämta alla användare
    const användareRader = await getRows(sheets, 'Användare!A:B')
    const användareMap = {}
    användareRader.forEach((rad) => {
      if (rad[0]) användareMap[rad[0]] = rad[1]
    })

    // Räkna poäng per användare
    const poängMap = {}

    tipsRader.forEach((rad) => {
      const user_id = rad[1]
      const match_id = rad[2]
      const tipHemma = rad[3]
      const tipBorta = rad[4]

      const resultat = resultatMap[match_id]
      if (!resultat) return // Matchen har inget resultat än

      const poäng = räknaPoäng(
        tipHemma,
        tipBorta,
        resultat.hemma_mål,
        resultat.borta_mål
      )

      if (!poängMap[user_id]) {
        poängMap[user_id] = { poäng: 0, exakta: 0, rätta: 0 }
      }

      poängMap[user_id].poäng += poäng
      if (poäng === 5) poängMap[user_id].exakta += 1
      if (poäng === 2) poängMap[user_id].rätta += 1
    })

    // Bygg topplistan
    const topplista = Object.entries(poängMap)
      .map(([user_id, stats]) => ({
        user_id,
        namn: användareMap[user_id] || 'Okänd',
        poäng: stats.poäng,
        exakta: stats.exakta,
        rätta: stats.rätta,
      }))
      .sort((a, b) => b.poäng - a.poäng)
      .map((rad, index) => ({ ...rad, plats: index + 1 }))

    return new Response(JSON.stringify(topplista), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}