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

    // ── Hämta alla deltagare ────────────────────────────────
    if (!user_id) {
      const användare = await getRows(sheets, 'Användare!A2:F1000')

      // Bygg rekryteringsräknare: user_id -> antal rekryterade
      const rekMap = {}
      användare.forEach((rad) => {
        const rekryteradAv = rad[5]?.trim()
        if (rekryteradAv) {
          rekMap[rekryteradAv] = (rekMap[rekryteradAv] || 0) + 1
        }
      })

      const deltagare = användare
        .filter(rad => rad[0]) // filtrera tomma rader
        .map((rad) => ({
          user_id:            rad[0],
          namn:               rad[1],
          email:              rad[2],
          rekryterade_antal:  rekMap[rad[0]] || 0,
          rekryterad_av:      rad[5]?.trim() || null,
        }))

      return new Response(JSON.stringify(deltagare), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Hämta en deltagares profil ──────────────────────────
    const användare = await getRows(sheets, 'Användare!A2:B1000')
    const användareRad = användare.find((r) => r[0] === user_id)

    if (!användareRad) {
      return new Response(
        JSON.stringify({ error: 'Användaren hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const matcherRader = await getRows(sheets, 'Matcher!A2:H1000')
    const matcherMap = {}
    matcherRader.forEach((rad) => {
      matcherMap[rad[0]] = {
        match_id: rad[0], datum: rad[1], tid: rad[2],
        hemmalag: rad[3], bortalag: rad[4], grupp: rad[5],
      }
    })

    const resultatRader = await getRows(sheets, 'Resultat!A2:D1000')
    const resultatMap = {}
    resultatRader.forEach((rad) => {
      if (rad[0]) resultatMap[rad[0]] = { hemma: rad[1], borta: rad[2] }
    })

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
          hemma_mål: rad[3],
          borta_mål: rad[4],
          poäng,
          ...match,
        }
      })

    const frågorSvarRader = await getRows(sheets, 'FrågorSvar!A2:D1000')
    const minaSvar = frågorSvarRader
      .filter((rad) => rad[1] === user_id)
      .map((rad) => ({
        svar_id: rad[0],
        fråga_id: rad[2],
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
    console.error('[participants]', err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}