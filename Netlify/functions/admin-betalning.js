import { getSheets, getRows } from './_sheets.js'

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

const GILTIGA_STATUSAR = ['ej_betalt', 'betalt', 'återbetald']

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (!verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Ej behörig' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user_id, status } = await req.json()

    if (!GILTIGA_STATUSAR.includes(status)) {
      return new Response(JSON.stringify({ error: 'Ogiltig status' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Viner!A2:F1000')
    const index = rader.findIndex((r) => r[0] === user_id)

    if (index < 0) {
      return new Response(JSON.stringify({ error: 'Användare hittades inte' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    const rowNumber = index + 2 // +1 för 1-baserat, +1 för rubrikrad
    const rad = rader[index]

    if (status === 'återbetald') {
      // Radera hela raden
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: await hämtaSheetId(sheets, 'Viner'),
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0-baserat
                endIndex: rowNumber,
              },
            },
          }],
        },
      })
    } else {
      // Uppdatera bara betalt-kolumnen (F)
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Viner!F${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[status]] },
      })
    }

    return new Response(
      JSON.stringify({
        message: status === 'återbetald' ? 'Vin raderat' : 'Status uppdaterad',
        user_id,
        namn: rad[1],
        vin_namn: rad[2],
        vin_pris: rad[4],
        status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-betalning] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Hämtar sheetId för ett givet sheet-namn (krävs för deleteDimension)
async function hämtaSheetId(sheets, namn) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  })
  const sheet = res.data.sheets.find((s) => s.properties.title === namn)
  if (!sheet) throw new Error(`Sheet "${namn}" hittades inte`)
  return sheet.properties.sheetId
}