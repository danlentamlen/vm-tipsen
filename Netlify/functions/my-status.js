import { getSheets, getRows } from './_sheets.js'
import jwt from 'jsonwebtoken'

// Slutspelsomgångar — samma lista som i frontend (Matches.jsx)
const SLUTSPELS_OMGÅNGAR = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final']

function verifyToken(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

/**
 * GET /.netlify/functions/my-status
 *
 * Returnerar inloggad användares tips-status:
 * - matcher:  { total, done }  — gruppspelsmatcher
 * - frågor:   { total, done }  — tilläggsfrågor
 *
 * Kräver Authorization: Bearer <token>
 */
export default async (req) => {
  const användare = verifyToken(req)
  if (!användare) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sheets = await getSheets()

    const [matcherRader, tipsRader, frågorRader, svarRader] = await Promise.all([
      getRows(sheets, 'Matcher!A2:H1000'),
      getRows(sheets, 'Tips!A2:E100000'),
      getRows(sheets, 'Frågor!A2:G1000'),
      getRows(sheets, 'FrågorSvar!A2:D100000'),
    ])

    // Gruppspelsmatcher (exkl. slutspel)
    const gruppMatchIds = new Set(
      matcherRader
        .filter((r) => r[0] && !SLUTSPELS_OMGÅNGAR.includes(r[6]))
        .map((r) => r[0])
    )

    // Användarens tips för gruppspelsmatcher
    const tipsadeMatchIds = new Set(
      tipsRader
        .filter((r) => r[1] === användare.user_id && gruppMatchIds.has(r[2]))
        .map((r) => r[2])
    )

    // Tilläggsfrågor
    const frågaIds = new Set(
      frågorRader.filter((r) => r[0]).map((r) => r[0])
    )

    // Användarens svar
    const besvaradeFrågaIds = new Set(
      svarRader
        .filter((r) => r[1] === användare.user_id && frågaIds.has(r[2]) && r[3] && r[3].trim())
        .map((r) => r[2])
    )

    return new Response(
      JSON.stringify({
        matcher: {
          total: gruppMatchIds.size,
          done:  tipsadeMatchIds.size,
        },
        frågor: {
          total: frågaIds.size,
          done:  besvaradeFrågaIds.size,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Netlify-Vary': 'authorization',
        },
      }
    )
  } catch (err) {
    console.error('[my-status]', err)
    return new Response(JSON.stringify({ error: 'Serverfel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
