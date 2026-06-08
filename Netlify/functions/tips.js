import { getSheets, getRows, appendRow } from './_sheets.js'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { ärMatchLåst } from './_settings.js'

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

export default async (req) => {
  const sheets = await getSheets()

  // ── GET: hämta tips för inloggad användare ──────────────────
  if (req.method === 'GET') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rader = await getRows(sheets, 'Tips!A2:E100000')
    const minaTips = rader
      .filter((rad) => rad[1] === användare.user_id)
      .map((rad) => ({
        tip_id:    rad[0],
        user_id:   rad[1],
        match_id:  rad[2],
        hemma_mål: rad[3],
        borta_mål: rad[4],
      }))

    return new Response(JSON.stringify(minaTips), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Netlify-Vary': 'authorization',
      },
    })
  }

  // ── POST: spara ett tips ────────────────────────────────────
  if (req.method === 'POST') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { match_id, hemma_mål, borta_mål } = await req.json()

    if (!match_id || hemma_mål === undefined || borta_mål === undefined) {
      return new Response(JSON.stringify({ error: 'Ofullständigt tips' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Låskontroll per match ──────────────────────────────
    const matcherRader = await getRows(sheets, 'Matcher!A2:H100000')

    const allaMatcher = matcherRader.map((rad) => ({
      match_id: rad[0],
      datum:    rad[1],
      tid:      rad[2],
      hemmalag: rad[3],
      bortalag: rad[4],
      grupp:    rad[5],
      omgång:   rad[6],
      arena:    rad[7],
    }))

    const dennaMatch = allaMatcher.find((m) => m.match_id === match_id)

    if (!dennaMatch) {
      return new Response(JSON.stringify({ error: 'Matchen hittades inte' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (ärMatchLåst(dennaMatch, allaMatcher)) {
      return new Response(
        JSON.stringify({ error: 'Tips för denna match är låsta' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Kolla om tips redan finns
    const befintliga = await getRows(sheets, 'Tips!A2:E100000')
    const befintligtIndex = befintliga.findIndex(
      (rad) => rad[1] === användare.user_id && rad[2] === match_id
    )

    if (befintligtIndex !== -1) {
      const radNummer = befintligtIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Tips!D${radNummer}:E${radNummer}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[hemma_mål, borta_mål]] },
      })
    } else {
      await appendRow(sheets, 'Tips!A:E', [
        uuidv4(),
        användare.user_id,
        match_id,
        hemma_mål,
        borta_mål,
      ])
    }

    return new Response(JSON.stringify({ message: 'Tips sparat!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method Not Allowed', { status: 405 })
}