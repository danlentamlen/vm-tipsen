import { getSheets, getRows, appendRow } from './_sheets.js'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

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
  const sheets = await getSheets()

  // Hämta tips för en användare
  if (req.method === 'GET') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rader = await getRows(sheets, 'Tips!A2:E1000')
    const minaTips = rader
      .filter((rad) => rad[1] === användare.user_id)
      .map((rad) => ({
        tip_id: rad[0],
        user_id: rad[1],
        match_id: rad[2],
        hemma_mål: rad[3],
        borta_mål: rad[4],
      }))

    return new Response(JSON.stringify(minaTips), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Spara ett tips
  if (req.method === 'POST') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Kolla om tips är låsta
    const { getSettings } = await import('./_settings.js')
    const settings = await getSettings()
    if (settings.tips_låst === 'true') {
    return new Response(
        JSON.stringify({ error: 'Tips är låsta och kan inte längre ändras' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
    }
    const { match_id, hemma_mål, borta_mål } = await req.json()

    if (!match_id || hemma_mål === undefined || borta_mål === undefined) {
      return new Response(JSON.stringify({ error: 'Ofullständigt tips' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Kolla om tips redan finns för denna match
    const befintliga = await getRows(sheets, 'Tips!A2:E1000')
    const befintligtIndex = befintliga.findIndex(
      (rad) => rad[1] === användare.user_id && rad[2] === match_id
    )

    if (befintligtIndex !== -1) {
      // Uppdatera befintligt tips
      const radNummer = befintligtIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Tips!D${radNummer}:E${radNummer}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[hemma_mål, borta_mål]],
        },
      })
    } else {
      // Skapa nytt tips
      await appendRow(sheets, 'Tips!A:E', [
        uuidv4(),
        användare.user_id,
        match_id,
        hemma_mål,
        borta_mål,
      ])
    }

    return new Response(JSON.stringify({ message: 'Tips sparat!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method Not Allowed', { status: 405 })
}