import { getSheets, getRows, appendRow } from './_sheets.js'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

// Kolumnstruktur i Frågor-sheetet:
// A = fråga_id
// B = fråga      (svenska)
// C = poäng
// D = typ        (t.ex. "team", "number", "choice:Ja/Nej")
// E = rätt_svar
// F = fråga_en   (engelska frågetext)
// G = typ_en     (engelska typ/alternativ, t.ex. "choice:Yes/No")

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

  // ── GET: Hämta alla frågor + mina svar ───────────────────────────
  if (req.method === 'GET') {
    const frågor = await getRows(sheets, 'Frågor!A2:G1000')
    const svar   = await getRows(sheets, 'FrågorSvar!A2:D100000')

    const användare = verifyToken(req)
    const minaSvar  = {}

    if (användare) {
      svar
        .filter((rad) => rad[1] === användare.user_id)
        .forEach((rad) => {
          minaSvar[rad[2]] = rad[3]
        })
    }

    const resultat = frågor.map((rad) => {
      const rättSvarRaw = (rad[4] || '').trim()
      const rättaSvar   = rättSvarRaw
        ? rättSvarRaw.split(';').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : []
      const mittSvar    = minaSvar[rad[0]] || null
      const harRättSvar = rättaSvar.length > 0

      // är_rätt: true/false om facit finns + användaren har svarat, annars null
      let ärRätt = null
      if (harRättSvar && mittSvar) {
        ärRätt = rättaSvar.includes(mittSvar.trim().toLowerCase())
      }

      return {
        fråga_id:      rad[0],
        fråga:         rad[1],
        poäng:         parseInt(rad[2]) || 0,
        typ:           (rad[3] || '').split('|')[0] || 'text',
        har_rätt_svar: harRättSvar,
        mitt_svar:     mittSvar,
        är_rätt:       ärRätt,   // true | false | null
        fråga_en:      (rad[5] || '').trim() || null,
        typ_en:        (rad[6] || '').trim() || null,
      }
    })

    return new Response(JSON.stringify(resultat), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── POST: Spara svar på en fråga ─────────────────────────────────
  if (req.method === 'POST') {
    const användare = verifyToken(req)
    if (!användare) {
      return new Response(
        JSON.stringify({ error: 'Ej inloggad' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { getSettings } = await import('./_settings.js')
    const settings = await getSettings()
    if (settings.tips_låst === 'true') {
      return new Response(
        JSON.stringify({ error: 'Frågorna är låsta och kan inte längre ändras' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { fråga_id, svar } = await req.json()

    if (!fråga_id || !svar) {
      return new Response(
        JSON.stringify({ error: 'Fråga och svar krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Kolla om svar redan finns — uppdatera i så fall
    const befintliga      = await getRows(sheets, 'FrågorSvar!A2:D100000')
    const befintligtIndex = befintliga.findIndex(
      (rad) => rad[1] === användare.user_id && rad[2] === fråga_id
    )

    if (befintligtIndex !== -1) {
      const radNummer = befintligtIndex + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `FrågorSvar!D${radNummer}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[svar]] },
      })
    } else {
      await appendRow(sheets, 'FrågorSvar!A:D', [
        uuidv4(),
        användare.user_id,
        fråga_id,
        svar,
      ])
    }

    return new Response(
      JSON.stringify({ message: 'Svar sparat!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response('Method Not Allowed', { status: 405 })
}