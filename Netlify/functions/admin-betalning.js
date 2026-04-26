import { getSheets, getRows } from './_sheets.js'

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Ej behörig' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user_id, betalt } = await req.json()

    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Viner!A2:F1000')

    const index = rader.findIndex((r) => r[0] === user_id)

    if (index < 0) {
      return new Response(JSON.stringify({ error: 'Användare hittades inte' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rowNumber = index + 2
    const befintlig = rader[index]

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Viner!A${rowNumber}:F${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[befintlig[0], befintlig[1], befintlig[2], befintlig[3], befintlig[4], betalt ? 'betalt' : 'ej_betalt']],
      },
    })

    return new Response(
      JSON.stringify({ message: 'Betalningsstatus uppdaterad' }),
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