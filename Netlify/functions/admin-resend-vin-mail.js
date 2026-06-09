import { getSheets, getRows } from './_sheets.js'
import { getSettings } from './_settings.js'
import { vinBekräftelseMail, skickaMail } from './_mail.js'

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
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user_id } = await req.json()
    const sheets = await getSheets()
    const [settings, vinerRader, användareRader] = await Promise.all([
      getSettings().catch(() => ({})),
      getRows(sheets, 'Viner!A2:F1000'),
      getRows(sheets, 'Användare!A2:C1000'),
    ])
    const swishNummer = settings.swish_nummer || ''

    const vinRad = vinerRader.find((r) => r[0] === user_id)
    const användarRad = användareRader.find((r) => r[0] === user_id)

    if (!vinRad || !användarRad) {
      return new Response(JSON.stringify({ error: 'Användare eller vin hittades inte' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    const namn    = vinRad[1] || användarRad[1]
    const email   = användarRad[2]
    const vinNamn = vinRad[2]
    const vinUrl  = vinRad[3]
    const vinPris = vinRad[4]

    if (!email) {
      return new Response(JSON.stringify({ error: 'Ingen e-postadress hittades' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = vinBekräftelseMail(namn, vinNamn, vinUrl, vinPris, true, swishNummer)
    await skickaMail(email, subject, html)

    return new Response(
      JSON.stringify({ message: `Bekräftelsemail skickat till ${email}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-resend-vin-mail] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
