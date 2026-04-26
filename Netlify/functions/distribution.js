import { getSheets, getRows } from './_sheets.js'
import { getSettings } from './_settings.js'

export default async (req) => {
  try {
    const settings = await getSettings()

    // Tipsfördelning visas bara när tips är låsta
    if (settings.tips_låst !== 'true') {
      return new Response(
        JSON.stringify({ error: 'Tips är inte låsta än' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sheets = await getSheets()
    const url = new URL(req.url)
    const match_id = url.searchParams.get('match_id')
    const fråga_id = url.searchParams.get('fråga_id')

    // Fördelning för en match
    if (match_id) {
      const tipsRader = await getRows(sheets, 'Tips!A2:E1000')
      const matchTips = tipsRader.filter((rad) => rad[2] === match_id)

      const totalt = matchTips.length
      if (totalt === 0) {
        return new Response(JSON.stringify({ totalt: 0, fördelning: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Räkna varje unikt resultat
      const räknare = {}
      matchTips.forEach((rad) => {
        const nyckel = `${rad[3]}-${rad[4]}`
        räknare[nyckel] = (räknare[nyckel] || 0) + 1
      })

      // Bygg fördelningslistan sorterad efter antal
      const fördelning = Object.entries(räknare)
        .map(([resultat, antal]) => ({
          resultat,
          antal,
          procent: Math.round((antal / totalt) * 100),
        }))
        .sort((a, b) => b.antal - a.antal)

      return new Response(
        JSON.stringify({ totalt, fördelning }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fördelning för en fråga
    if (fråga_id) {
      const svarRader = await getRows(sheets, 'FrågorSvar!A2:D1000')
      const frågorSvar = svarRader.filter((rad) => rad[2] === fråga_id)

      const totalt = frågorSvar.length
      if (totalt === 0) {
        return new Response(JSON.stringify({ totalt: 0, fördelning: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const räknare = {}
      frågorSvar.forEach((rad) => {
        const svar = rad[3] || '–'
        räknare[svar] = (räknare[svar] || 0) + 1
      })

      const fördelning = Object.entries(räknare)
        .map(([svar, antal]) => ({
          resultat: svar,
          antal,
          procent: Math.round((antal / totalt) * 100),
        }))
        .sort((a, b) => b.antal - a.antal)

      return new Response(
        JSON.stringify({ totalt, fördelning }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'match_id eller fråga_id krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}