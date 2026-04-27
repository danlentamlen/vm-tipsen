import { v4 as uuidv4 } from 'uuid'
import { getSheets, getRows, appendRow } from './_sheets.js'
import { skickaMail } from './_mail.js'

const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'
const TOKEN_TTL_MINUTER = 60 // Token giltig i 60 minuter

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email krävs' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const sheets = await getSheets()
    const användare = await getRows(sheets, 'Användare!A2:C1000')
    const rad = användare.find((r) => r[2]?.trim().toLowerCase() === email.trim().toLowerCase())

    // Returnera alltid OK — avslöja inte om emailen finns
    if (!rad) {
      console.log(`[auth-forgot] Email hittades inte: ${email}`)
      return new Response(
        JSON.stringify({ message: 'Om emailen finns skickas en återställningslänk.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const user_id = rad[0]
    const namn = rad[1]
    const token = uuidv4()
    const expires_at = new Date(Date.now() + TOKEN_TTL_MINUTER * 60 * 1000).toISOString()

    // Spara token i PasswordTokens-sheet
    await appendRow(sheets, 'PasswordTokens!A:C', [token, user_id, expires_at])

    // Skicka återställningsmail
    const resetUrl = `${SITE_URL}/nytt-losenord?token=${token}`
    const förnamn = namn.split(' ')[0]

    await skickaMail(email, '🔑 Återställ ditt lösenord — VM-tipsen 2026', `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#0a1628;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:2rem;margin:0">⚽</p>
          <h1 style="color:#F0D060;font-size:1.3rem;margin:8px 0 4px;letter-spacing:0.04em">VM-TIPSEN 2026</h1>
          <p style="color:rgba(255,255,255,0.45);font-size:0.78rem;margin:0">FIFA World Cup</p>
        </div>

        <h2 style="color:#0a1628;margin-bottom:8px">Hej ${förnamn},</h2>
        <p style="color:#555;line-height:1.7">
          Vi fick en förfrågan om att återställa lösenordet för ditt konto.
          Klicka på knappen nedan för att välja ett nytt lösenord.
        </p>

        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}"
             style="display:inline-block;background:#C8102E;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.9rem">
            ÅTERSTÄLL LÖSENORD
          </a>
        </div>

        <p style="color:#aaa;font-size:0.8rem;line-height:1.6;text-align:center">
          Länken är giltig i ${TOKEN_TTL_MINUTER} minuter.<br>
          Om du inte begärde detta kan du ignorera det här mailet.
        </p>

        <p style="color:#ccc;font-size:0.72rem;text-align:center;margin-top:24px">
          VM-tipsen 2026 · FIFA World Cup
        </p>
      </div>
    `)

    console.log(`[auth-forgot] Återställningsmail skickat till ${email}`)
    return new Response(
      JSON.stringify({ message: 'Om emailen finns skickas en återställningslänk.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[auth-forgot] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}