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
    return new Response(
      JSON.stringify({ error: 'Ej behörig' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { match_id, hemma, borta } = await req.json()
    const sheets = await getSheets()

    const rader = await getRows(sheets, 'Resultat!A2:D1000')
    const index = rader.findIndex((rad) => rad[0] === match_id)
    const uppdaterad = new Date().toISOString()

    if (index !== -1) {
      const radNummer = index + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Resultat!A${radNummer}:D${radNummer}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[match_id, hemma, borta, uppdaterad]] },
      })
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Resultat!A:D',
        valueInputOption: 'RAW',
        requestBody: { values: [[match_id, hemma, borta, uppdaterad]] },
      })
    }

    return new Response(
      JSON.stringify({ message: 'Resultat sparat!' }),
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