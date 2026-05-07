import jwt from 'jsonwebtoken'
import { getSheets, getRows } from './_sheets.js'

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
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const användare = verifyToken(req)
  if (!användare) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { rekryterad_av } = await req.json()
    if (!rekryterad_av) {
      return new Response(JSON.stringify({ error: 'rekryterad_av krävs' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Användare!A2:F1000')
    const index = rader.findIndex(r => r[0] === användare.user_id)

    if (index < 0) {
      return new Response(JSON.stringify({ error: 'Användaren hittades inte' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Kolla om rekryterarval redan gjorts — om kolumn F redan är satt, neka
    if (rader[index][5]?.trim()) {
      return new Response(JSON.stringify({ error: 'Rekryterare redan vald — kan inte ändras' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Förhindra att man väljer sig själv
    if (rekryterad_av === användare.user_id) {
      return new Response(JSON.stringify({ error: 'Du kan inte välja dig själv som rekryterare' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Spara i kolumn F
    const radNummer = index + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Användare!F${radNummer}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[rekryterad_av]] },
    })

    return new Response(JSON.stringify({ message: 'Rekryterare sparad!' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[rekryterad-spara]', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}