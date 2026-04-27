import bcrypt from 'bcryptjs'
import { getSheets, getRows } from './_sheets.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { token, lösenord } = await req.json()

    if (!token || !lösenord) {
      return new Response(JSON.stringify({ error: 'Token och lösenord krävs' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    if (lösenord.length < 6) {
      return new Response(JSON.stringify({ error: 'Lösenordet måste vara minst 6 tecken' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const sheets = await getSheets()

    // Hämta token från PasswordTokens-sheet
    const tokenRader = await getRows(sheets, 'PasswordTokens!A2:C1000')
    const tokenIndex = tokenRader.findIndex((r) => r[0] === token)

    if (tokenIndex < 0) {
      return new Response(JSON.stringify({ error: 'Ogiltig eller redan använd länk' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const [sparadToken, user_id, expires_at] = tokenRader[tokenIndex]

    // Kolla om token har gått ut
    if (new Date(expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Länken har gått ut — begär en ny' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Hitta användaren och uppdatera lösenordet
    const användareRader = await getRows(sheets, 'Användare!A2:D1000')
    const användarIndex = användareRader.findIndex((r) => r[0] === user_id)

    if (användarIndex < 0) {
      return new Response(JSON.stringify({ error: 'Användaren hittades inte' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    const nyttHash = await bcrypt.hash(lösenord, 10)
    const användarRowNumber = användarIndex + 2

    // Uppdatera lösenordshash i kolumn D
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Användare!D${användarRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[nyttHash]] },
    })

    // Radera token så den inte kan återanvändas
    const tokenRowNumber = tokenIndex + 2
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `PasswordTokens!A${tokenRowNumber}:C${tokenRowNumber}`,
    })

    console.log(`[auth-reset] Lösenord uppdaterat för user_id=${user_id}`)
    return new Response(
      JSON.stringify({ message: 'Lösenordet är uppdaterat! Du kan nu logga in.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[auth-reset] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}