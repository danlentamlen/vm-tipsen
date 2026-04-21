import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getSheets, appendRow, getRows } from './_sheets.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { namn, email, lösenord } = await req.json()

    if (!namn || !email || !lösenord) {
      return new Response(
        JSON.stringify({ error: 'Alla fält måste fyllas i' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sheets = await getSheets()

    const befintliga = await getRows(sheets, 'Användare!A:E')
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

    await appendRow(sheets, 'Användare!A:E', [
      user_id,
      namn,
      email,
      lösenord_hash,
      skapad,
    ])

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