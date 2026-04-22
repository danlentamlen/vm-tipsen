import { getSettings, setSetting } from './_settings.js'

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  const token = auth.replace('Bearer ', '')
  return token === process.env.ADMIN_SECRET
}

export default async (req) => {
  if (!verifyAdmin(req)) {
    return new Response(
      JSON.stringify({ error: 'Ej behörig' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Hämta inställningar
  if (req.method === 'GET') {
    const settings = await getSettings()
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Uppdatera inställning
  if (req.method === 'POST') {
    const { nyckel, värde } = await req.json()
    await setSetting(nyckel, värde)
    return new Response(
      JSON.stringify({ message: 'Inställning sparad' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response('Method Not Allowed', { status: 405 })
}