import { getSheets, getRows } from './_sheets.js'
import { betalningsMail, skickaMail } from './_mail.js'

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
    const { user_id, status } = await req.json()
    const sheets = await getSheets()
    const [vinerRader, användareRader] = await Promise.all([
      getRows(sheets, 'Viner!A2:F1000'),
      getRows(sheets, 'Användare!A2:C1000'),
    ])

    const vinRad = vinerRader.find((r) => r[0] === user_id)
    const användarRad = användareRader.find((r) => r[0] === user_id)

    if (!vinRad || !användarRad) {
      return new Response(JSON.stringify({ error: 'Användare eller vin hittades inte' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    const namn = vinRad[1] || användarRad[1]
    const email = användarRad[2]
    const vinNamn = vinRad[2]
    const vinPris = vinRad[4]

    const { subject, html } = betalningsMail(namn, vinNamn, vinPris, status)
    await skickaMail(email, subject, html)

    return new Response(
      JSON.stringify({ message: `Mail skickat till ${email}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-kvitto] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}