import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getSheets, appendRow, getRows } from './_sheets.js'
import { välkomstMail, skickaMail } from './_mail.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { namn, email, lösenord, rekryterad_av } = await req.json()

    if (!namn || !email || !lösenord) {
      return new Response(
        JSON.stringify({ error: 'Alla fält måste fyllas i' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sheets = await getSheets()
    const befintliga = await getRows(sheets, 'Användare!A2:E1000')
    const emailFinns = befintliga.some((rad) => rad[2] === email)

    if (emailFinns) {
      return new Response(
        JSON.stringify({ error: 'Email är redan registrerad' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const lösenord_hash = await bcrypt.hash(lösenord, 10)
    const user_id = uuidv4()
    const skapad = new Date().toISOString()

    // Kolumn F = rekryterad_av (user_id för rekryteraren, eller tomt)
    await appendRow(sheets, 'Användare!A:F', [
      user_id,
      namn,
      email,
      lösenord_hash,
      skapad,
      rekryterad_av || '',
    ])

    const { subject, html } = välkomstMail(namn)
    skickaMail(email, subject, html).catch((err) =>
      console.error('[auth-register] Kunde inte skicka välkomstmail:', err.message)
    )

    return new Response(
      JSON.stringify({ message: 'Konto skapat!', user_id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}