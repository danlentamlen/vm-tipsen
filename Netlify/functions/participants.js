import { getSheets, getRows } from './_sheets.js'
import jwt from 'jsonwebtoken'

function verifyToken(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export default async (req) => {
  try {
    const sheets = await getSheets()
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')

    // Hämta alla deltagare
    if (!user_id) {
     // const användare = await getRows(sheets, 'Användare!A:C')
      const användare = await getRows(sheets, 'Användare!A2:C1000')
      const deltagare = användare.map((rad) => ({
        user_id: rad[0],
        namn: rad[1],
        email: rad[2],
      }))

      return new Response(JSON.stringify(deltagare), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Hämta en deltagares profil
    const användare = await getRows(sheets, 'Användare!A:B')
    const användareRad = användare.find((r) => r[0] === user_id)

    if (!användareRad) {
      return new Response(
        JSON.stringify({ error: 'Användaren hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Hämta matcher
    const matcherRader = await getRows(sheets, 'Matcher!A2:H1000')
    const matcherMap = {}
    matcherRader.forEach((rad) => {
      matcherMap[rad[0]] = {
        match_id: rad[0],
        datum: rad[1],
        tid: rad[2],
        hemmalag: rad[3],
        bortalag: rad[4],
        grupp: rad[5],
      }
    })

    // Hämta resultat
    const resultatRader = await getRows(sheets, 'Resultat!A2:D1000')
    const resultatMap = {}
    resultatRader.forEach((rad) => {
      if (rad[0]) resultatMap[rad[0]] = { hemma: rad[1], borta: rad[2] }
    })

    // Hämta tips för denna användare
    const tipsRader = await getRows(sheets, 'Tips!A2:E1000')
    const minaTips = tipsRader
      .filter((rad) => rad[1] === user_id)
      .map((rad) => {
        const match = matcherMap[rad[2]] || {}
        const resultat = resultatMap[rad[2]]
        let poäng = null

        if (resultat) {
          const th = parseInt(rad[3])
          const tb = parseInt(rad[4])
          const rh = parseInt(resultat.hemma)
          const rb = parseInt(resultat.borta)

          if (th === rh && tb === rb) poäng = 5
          else {
            const tipUtg = th > tb ? 'h' : th < tb ? 'b' : 'o'
            const resUtg = rh > rb ? 'h' : rh < rb ? 'b' : 'o'
            poäng = tipUtg === resUtg ? 2 : 0
          }
        }

        return {
          match_id: rad[2],
          hemmalag: match.hemmalag || rad[2],
          bortalag: match.bortalag || '',
          datum: match.datum || '',
          grupp: match.grupp || '',
          tip_hemma: rad[3],
          tip_borta: rad[4],
          resultat_hemma: resultat?.hemma || null,
          resultat_borta: resultat?.borta || null,
          poäng,
        }
      })

    // Hämta frågor
    const frågorRader = await getRows(sheets, 'Frågor!A2:D1000')
    const frågorMap = {}
    frågorRader.forEach((rad) => {
      frågorMap[rad[0]] = {
        fråga: rad[1],
        poäng: parseInt(rad[2]),
      }
    })

    // Hämta frågesvar för denna användare
    const svarRader = await getRows(sheets, 'FrågorSvar!A2:D1000')
    const minaSvar = svarRader
      .filter((rad) => rad[1] === user_id)
      .map((rad) => ({
        fråga_id: rad[2],
        fråga: frågorMap[rad[2]]?.fråga || rad[2],
        poäng: frågorMap[rad[2]]?.poäng || 0,
        svar: rad[3],
      }))

    return new Response(
      JSON.stringify({
        user_id,
        namn: användareRad[1],
        tips: minaTips,
        svar: minaSvar,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}