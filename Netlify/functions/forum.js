import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getSheets, getRows, appendRow } from './_sheets.js'

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

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  const token = auth.replace('Bearer ', '')
  return token === process.env.ADMIN_SECRET
}

export default async (req) => {
  // ── GET: hämta alla inlägg + svar ──────────────────────────
  if (req.method === 'GET') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      console.log('[forum] GET - ansluter till Sheets...')
      const sheets = await getSheets()
      console.log('[forum] GET - Sheets OK, hämtar ForumInlagg...')

      let inläggRader = []
      try {
        inläggRader = await getRows(sheets, 'ForumInlagg!A2:E1000')
        console.log(`[forum] ForumInlagg: ${inläggRader.length} rader`)
      } catch (e) {
        console.error('[forum] FEL vid läsning av ForumInlagg:', e.message)
        return new Response(JSON.stringify({
          error: `Kunde inte läsa fliken ForumInlagg: ${e.message}`,
        }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }

      const inlägg = inläggRader
        .filter((rad) => rad[0] && rad[3])
        .map((rad) => ({
          id: rad[0],
          user_id: rad[1],
          namn: rad[2],
          text: rad[3],
          created_at: rad[4],
          svar: [],
          gillningar: 0,
        }))

      let svarRader = []
      try {
        svarRader = await getRows(sheets, 'ForumSvar!A2:F1000')
        console.log(`[forum] ForumSvar: ${svarRader.length} rader`)
      } catch (e) {
        console.error('[forum] FEL vid läsning av ForumSvar:', e.message)
        return new Response(JSON.stringify({
          error: `Kunde inte läsa fliken ForumSvar: ${e.message}`,
        }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }

      svarRader
        .filter((rad) => rad[0] && rad[4])
        .forEach((rad) => {
          const parent = inlägg.find((i) => i.id === rad[1])
          if (parent) {
            parent.svar.push({
              id: rad[0],
              inlägg_id: rad[1],
              user_id: rad[2],
              namn: rad[3],
              text: rad[4],
              created_at: rad[5],
            })
          }
        })

      let gillRader = []
      try {
        gillRader = await getRows(sheets, 'ForumGillningar!A2:C1000')
        console.log(`[forum] ForumGillningar: ${gillRader.length} rader`)
      } catch (e) {
        console.error('[forum] FEL vid läsning av ForumGillningar:', e.message)
        return new Response(JSON.stringify({
          error: `Kunde inte läsa fliken ForumGillningar: ${e.message}`,
        }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }

      gillRader.forEach((rad) => {
        const parent = inlägg.find((i) => i.id === rad[1])
        if (parent) {
          parent.gillningar++
          if (rad[2] === användare.user_id) {
            parent.gillad_av_mig = true
          }
        }
      })

      inlägg.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      console.log(`[forum] GET klar — returnerar ${inlägg.length} inlägg`)

      return new Response(JSON.stringify(inlägg), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('[forum] GET oväntat fel:', err.message, err.stack)
      return new Response(JSON.stringify({ error: `Kunde inte hämta inlägg: ${err.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ── POST: skapa inlägg, svar eller gillning ────────────────
  if (req.method === 'POST') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const body = await req.json()
      const sheets = await getSheets()

      if (body.typ === 'gilla') {
        const { inlägg_id } = body
        if (!inlägg_id) {
          return new Response(JSON.stringify({ error: 'inlägg_id krävs' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          })
        }
        const gillRader = await getRows(sheets, 'ForumGillningar!A2:C1000')
        const redanGillat = gillRader.find((r) => r[1] === inlägg_id && r[2] === användare.user_id)
        if (!redanGillat) {
          await appendRow(sheets, 'ForumGillningar!A:C', [uuidv4(), inlägg_id, användare.user_id])
        }
        return new Response(JSON.stringify({ message: 'Gillat!' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }

      if (body.typ === 'svar') {
        const { inlägg_id, text } = body
        if (!inlägg_id || !text?.trim()) {
          return new Response(JSON.stringify({ error: 'inlägg_id och text krävs' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          })
        }
        const id = uuidv4()
        const created_at = new Date().toISOString()
        await appendRow(sheets, 'ForumSvar!A:F', [id, inlägg_id, användare.user_id, användare.namn, text.trim(), created_at])
        return new Response(
          JSON.stringify({ id, inlägg_id, user_id: användare.user_id, namn: användare.namn, text: text.trim(), created_at }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Nytt inlägg
      const { text } = body
      if (!text?.trim()) {
        return new Response(JSON.stringify({ error: 'Text krävs' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        })
      }
      const id = uuidv4()
      const created_at = new Date().toISOString()
      await appendRow(sheets, 'ForumInlagg!A:E', [id, användare.user_id, användare.namn, text.trim(), created_at])
      return new Response(
        JSON.stringify({ id, user_id: användare.user_id, namn: användare.namn, text: text.trim(), created_at, svar: [], gillningar: 0, gillad_av_mig: false }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      console.error('[forum] POST fel:', err)
      return new Response(JSON.stringify({ error: 'Kunde inte spara' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ── DELETE: ta bort inlägg eller svar (admin eller ägare) ───
  if (req.method === 'DELETE') {
    const isAdmin = verifyAdmin(req)
    const användare = verifyToken(req)

    if (!isAdmin && !användare) {
      return new Response(JSON.stringify({ error: 'Ej behörig' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const { id, typ } = await req.json() // typ: 'inlägg' | 'svar'
      if (!id || !typ) {
        return new Response(JSON.stringify({ error: 'id och typ krävs' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        })
      }

      const sheets = await getSheets()
      const sheetName  = typ === 'svar' ? 'ForumSvar'   : 'ForumInlagg'
      const sheetRange = typ === 'svar' ? 'ForumSvar!A2:F1000' : 'ForumInlagg!A2:E1000'
      const sista      = typ === 'svar' ? 'F' : 'E'

      const rader = await getRows(sheets, sheetRange)
      const index = rader.findIndex((r) => r[0] === id)
      if (index < 0) {
        return new Response(JSON.stringify({ error: 'Hittades inte' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        })
      }

      // Kolla att användaren äger inlägget (om inte admin)
      // ForumInlagg: user_id är kolumn B (index 1)
      // ForumSvar:   user_id är kolumn C (index 2)
      if (!isAdmin) {
        const ägarKolumn = typ === 'svar' ? 2 : 1
        if (rader[index][ägarKolumn] !== användare.user_id) {
          return new Response(JSON.stringify({ error: 'Du kan bara radera dina egna inlägg' }), {
            status: 403, headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      const radNummer = index + 2
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A${radNummer}:${sista}${radNummer}`,
      })

      console.log(`[forum] DELETE ${typ} id=${id} rad=${radNummer} av=${isAdmin ? 'admin' : användare.user_id}`)
      return new Response(JSON.stringify({ message: 'Raderat' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('[forum] DELETE fel:', err)
      return new Response(JSON.stringify({ error: 'Kunde inte radera' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
}