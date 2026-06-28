/**
 * admin-delete-user.js
 *
 * Tar bort alla tips och frågesvar för en given user_id.
 * Raderar rader direkt från Tips- och FrågorSvar-sheeten.
 *
 * POST /api/admin-delete-user
 * Body: { "user_id": "uuid-..." }
 *
 * Auth: Bearer <ADMIN_SECRET> krävs.
 */
import { getSheets, getRows, getSheetIds, deleteRows } from './_sheets.js'

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

  let user_id
  try {
    const body = await req.json()
    user_id = body.user_id?.trim()
  } catch {
    return new Response(JSON.stringify({ error: 'Ogiltig JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id saknas' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sheets   = await getSheets()
    const sheetIds = await getSheetIds(sheets)

    // Läs bägge sheeten parallellt
    const [tipsRader, frågorSvarRader] = await Promise.all([
      getRows(sheets, 'Tips!A2:E100000'),
      getRows(sheets, 'FrågorSvar!A2:D100000'),
    ])

    // Hitta rader (0-baserat inkl. rubrikrad → index + 1 eftersom A1 är rubriken)
    // getRows returnerar data från rad 2, så arrayindex 0 = spreadsheetrad 2 = 0-baserat index 1
    const tipsIndexar     = tipsRader
      .map((rad, i) => (rad[1] === user_id ? i + 1 : null))
      .filter((i) => i !== null)

    const frågorSvarIndexar = frågorSvarRader
      .map((rad, i) => (rad[1] === user_id ? i + 1 : null))
      .filter((i) => i !== null)

    // Ta bort (fallande ordning hanteras inuti deleteRows)
    await Promise.all([
      deleteRows(sheets, sheetIds['Tips'],       tipsIndexar),
      deleteRows(sheets, sheetIds['FrågorSvar'], frågorSvarIndexar),
    ])

    return new Response(
      JSON.stringify({
        message: `Klart. ${tipsIndexar.length} tipsrader och ${frågorSvarIndexar.length} frågesvar borttagna för ${user_id}.`,
        tips_borttagna:      tipsIndexar.length,
        frågesvar_borttagna: frågorSvarIndexar.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-delete-user] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
