import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSheets, getRows } from './_sheets.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { email, lösenord } = await req.json()

    if (!email || !lösenord) {
      return new Response(
        JSON.stringify({ error: 'Email och lösenord krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Användare!A:E')

    const rad = rader.find((r) => r[2] === email)

    if (!rad) {
      return new Response(
        JSON.stringify({ error: 'Fel email eller lösenord' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const [user_id, namn, , lösenord_hash] = rad

    const stämmer = await bcrypt.compare(lösenord, lösenord_hash)

    if (!stämmer) {
      return new Response(
        JSON.stringify({ error: 'Fel email eller lösenord' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = jwt.sign(
      { user_id, namn, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return new Response(
      JSON.stringify({ token, namn, user_id }),
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