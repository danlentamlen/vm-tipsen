/**
 * admin-cache.js
 *
 * Tvingar omläsning av locked-snapshot-cache (Användare, Viner, Frågor, FrågorSvar).
 * Används när t.ex. rätt_svar eller poäng uppdaterats i Frågor-sheetet.
 *
 * POST /api/admin-cache  — invaliderar och läser om cachen
 *
 * Auth: Bearer <ADMIN_SECRET> krävs.
 */
import { refreshLockedSnapshot } from './_lockedData.js'

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
    await refreshLockedSnapshot()
    return new Response(
      JSON.stringify({ message: 'Cache tömd och omladdad.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-cache] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
