import { getSheets, getRows } from './_sheets.js'
import { getLockedSnapshot } from './_lockedData.js'
import { GRUPPSPEL_DEADLINE, parseMatchTid } from './_settings.js'
import jwt from 'jsonwebtoken'

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
 * Hittar den "aktiva" slutspelsomgången:
 * - Kronologiskt sorterade omgångar efter första matchens starttid
 * - Aktiv = första omgången vars tips-deadline (firstMatch - 4h) ännu inte passerat
 * - Om alla är låsta = senast låsta omgången (visar slutresultatet)
 */
function finnAktivOmgång(slutspelRader, nu) {
  // Gruppera per omgång
  const omgångMap = {}
  for (const r of slutspelRader) {
    const omg = r[6]
    if (!omg) continue
    if (!omgångMap[omg]) omgångMap[omg] = []
    omgångMap[omg].push(r)
  }

  // Beräkna första starttid och deadline per omgång
  const omgångar = Object.entries(omgångMap).map(([omg, rader]) => {
    const starttider = rader
      .map((r) => parseMatchTid(r[1], r[2]))
      .filter(Boolean)
    if (starttider.length === 0) return null
    const firstStart = new Date(Math.min(...starttider.map((d) => d.getTime())))
    const deadline   = new Date(firstStart.getTime() - 4 * 60 * 60 * 1000) // -4h
    return { omg, rader, firstStart, deadline }
  }).filter(Boolean)

  // Sortera kronologiskt efter första match
  omgångar.sort((a, b) => a.firstStart - b.firstStart)

  // Välj aktiv omgång
  let aktiv = null
  for (const o of omgångar) {
    if (nu < o.deadline) {
      // Deadline ej passerad — öppen för tips
      return { ...o, öppen: true }
    }
    // Deadline passerad — spara som fallback
    aktiv = { ...o, öppen: false }
  }
  return aktiv // senast låsta (null om inga slutspelsmatcher finns)
}

/**
 * GET /.netlify/functions/my-status
 *
 * Returnerar inloggad användares tips-status:
 *   matcher:  { total, done }          — gruppspelsmatcher (visas före deadline)
 *   frågor:   { total, done }          — tilläggsfrågor (visas alltid)
 *   slutspel: { omgång, total, done, öppen } | null  — aktiv slutspelsomgång (efter deadline)
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

    // Matcher/Frågor/FrågorSvar är låsta → ur persistent cache (ett Sheets-anrop,
    // delat mellan instanser). Bara Tips läses live (kan växa för slutspel).
    const [{ matcher: matcherRader, frågor: frågorRader, frågorSvar: svarRader }, tipsRader] =
      await Promise.all([
        getLockedSnapshot(),
        getRows(sheets, 'Tips!A2:E100000'),
      ])

    const nu = new Date()
    const efterDeadline = nu >= GRUPPSPEL_DEADLINE

    // ── Gruppspelsmatcher (grupp !== 'Slutspel', samma logik som Matches.jsx) ──
    const gruppMatchIds = new Set(
      matcherRader
        .filter((r) => r[0] && r[5] !== 'Slutspel')
        .map((r) => r[0])
    )
    const tipsadeGrupp = new Set(
      tipsRader
        .filter((r) => r[1] === användare.user_id && gruppMatchIds.has(r[2]))
        .map((r) => r[2])
    )

    // ── Tilläggsfrågor ──
    const frågaIds = new Set(frågorRader.filter((r) => r[0]).map((r) => r[0]))
    const besvarade = new Set(
      svarRader
        .filter((r) => r[1] === användare.user_id && frågaIds.has(r[2]) && r[3]?.trim())
        .map((r) => r[2])
    )

    // ── Aktiv slutspelsomgång (bara efter deadline) ──
    let slutspel = null
    if (efterDeadline) {
      const slutspelRader = matcherRader.filter((r) => r[0] && r[5] === 'Slutspel')
      const aktiv = finnAktivOmgång(slutspelRader, nu)
      if (aktiv) {
        const omgångMatchIds = new Set(aktiv.rader.map((r) => r[0]))
        const tipsadeSlutspel = new Set(
          tipsRader
            .filter((r) => r[1] === användare.user_id && omgångMatchIds.has(r[2]))
            .map((r) => r[2])
        )
        slutspel = {
          omgång: aktiv.omg,
          total:  omgångMatchIds.size,
          done:   tipsadeSlutspel.size,
          öppen:  aktiv.öppen,
        }
      }
    }

    return new Response(
      JSON.stringify({
        matcher: { total: gruppMatchIds.size, done: tipsadeGrupp.size },
        frågor:  { total: frågaIds.size,      done: besvarade.size },
        slutspel,
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
