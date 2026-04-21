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

  // Hämta alla frågor + mina svar
  if (req.method === 'GET') {
    const frågor = await getRows(sheets, 'Frågor!A2:E1000')
    const svar = await getRows(sheets, 'FrågorSvar!A2:D1000')

    const användare = verifyToken(req)
    const minaSvar = {}

    if (användare) {
      svar
        .filter((rad) => rad[1] === användare.user_id)
        .forEach((rad) => {
          minaSvar[rad[2]] = rad[3]
        })
    }

    const resultat = frågor.map((rad) => ({
        fråga_id: rad[0],
        fråga: rad[1],
        poäng: parseInt(rad[2]),
        typ: (rad[3] || '').split('|')[0] || 'text',
        har_rätt_svar: false, // låser aldrig för användaren, admin ser svaret i Sheets
        mitt_svar: minaSvar[rad[0]] || null,
    }))

    return new Response(JSON.stringify(resultat), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Spara svar på en fråga
  if (req.method === 'POST') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(
        JSON.stringify({ error: 'Ej inloggad' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { fråga_id, svar } = await req.json()

    if (!fråga_id || !svar) {
      return new Response(
        JSON.stringify({ error: 'Fråga och svar krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Kolla om svar redan finns
    const befintliga = await getRows(sheets, 'FrågorSvar!A2:D1000')
    const befintligtIndex = befintliga.findIndex(
      (rad) => rad[1] === användare.user_id && rad[2] === fråga_id
    )

    if (befintligtIndex !== -1) {
      // Uppdatera befintligt svar
      const radNummer = befintligtIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `FrågorSvar!D${radNummer}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[svar]] },
      })
    } else {
      await appendRow(sheets, 'FrågorSvar!A:D', [
        uuidv4(),
        användare.user_id,
        fråga_id,
        svar,
      ])
    }

    return new Response(
      JSON.stringify({ message: 'Svar sparat!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response('Method Not Allowed', { status: 405 })
}