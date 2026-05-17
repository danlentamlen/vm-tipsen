import { getSheets, getRows } from './_sheets.js'

// Kolumnstruktur i Frågor-sheetet:
// A = fråga_id
// B = fråga (svenska)
// C = poäng
// D = typ        (t.ex. "team", "number", "choice:Ja/Nej") — utan pipe-separator
// E = rätt_svar
// F = fråga_en
// G = typ_en

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const sheets = await getSheets()

    // Hämta frågor för att hitta team-typfrågor (VM-vinnare)
    // Typ finns nu direkt i kolumn D utan pipe — ingen split behövs
    const frågor = await getRows(sheets, 'Frågor!A2:D1000')
    const teamFrågor = new Set(
      frågor
        .filter((rad) => (rad[3] || '').trim() === 'team')
        .map((rad) => rad[0])
    )

    if (teamFrågor.size === 0) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // Hitta första team-svaret per användare
    const svarRader = await getRows(sheets, 'FrågorSvar!A2:D1000')
    const vinnareMap = {}

    svarRader.forEach((rad) => {
      const user_id  = rad[1]
      const fråga_id = rad[2]
      const svar     = rad[3]
      if (teamFrågor.has(fråga_id) && svar && !vinnareMap[user_id]) {
        vinnareMap[user_id] = svar
      }
    })

    return new Response(JSON.stringify(vinnareMap), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[vm-vinnare] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}