import jwt from 'jsonwebtoken'
import { getSheets, getRows, appendRow } from './_sheets.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Inte inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return new Response(JSON.stringify({ error: 'Ogiltig token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { vin_namn, vin_url, vin_pris } = await req.json()

    if (!vin_namn || !vin_url) {
      return new Response(
        JSON.stringify({ error: 'Vinnamn och länk krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Viner!A:F')

    // Find existing row for this user
    const befintligIndex = rader.findIndex((r) => r[0] === decoded.user_id)

    if (befintligIndex >= 0) {
      // Update existing row (row index + 1 for 1-based, + 1 for header)
      const rowNumber = befintligIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Viner!A${rowNumber}:F${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[decoded.user_id, decoded.namn, vin_namn, vin_url, vin_pris || '', rader[befintligIndex][5] || 'ej_betalt']],
        },
      })
    } else {
      // Append new row
      await appendRow(sheets, 'Viner!A:F', [
        decoded.user_id,
        decoded.namn,
        vin_namn,
        vin_url,
        vin_pris || '',
        'ej_betalt',
      ])
    }

    return new Response(
      JSON.stringify({ message: 'Vinet sparades!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}