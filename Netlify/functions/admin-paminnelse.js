// Netlify/functions/admin-påminnelse.js
//
// Finds participants who have signed up (in Användare sheet) but have NOT yet
// added a wine bottle (no row in Viner sheet), then sends them a reminder email.
//
// POST  { user_ids: ['id1', 'id2', ...] }  → send to specific users
// POST  { all: true }                       → send to ALL without wine
// GET                                       → return list of participants without wine (no mail sent)
//
// Auth: Bearer <ADMIN_SECRET> required for all methods.

import { getSheets, getRows } from './_sheets.js'
import { getSettings } from './_settings.js'
import { skickaMail } from './_mail.js'

// ── Security ──────────────────────────────────────────────────────────────────
function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

// ── Email template ────────────────────────────────────────────────────────────
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'

function header() {
  return `
    <div style="background:#0a1628;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:2rem;margin:0">⚽</p>
      <h1 style="color:#F0D060;font-size:1.3rem;margin:8px 0 4px;letter-spacing:0.04em;font-family:sans-serif">VM-TIPSEN 2026</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:0.78rem;margin:0;font-family:sans-serif">FIFA World Cup</p>
    </div>
  `
}

function footer() {
  return `<p style="color:#ccc;font-size:0.72rem;text-align:center;margin-top:32px;font-family:sans-serif">VM-tipsen 2026 · FIFA World Cup · <a href="${SITE_URL}" style="color:#ccc">vm-tipsen.se</a></p>`
}

function wrap(content) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">${header()}${content}${footer()}</div>`
}

function vinPåminnelseMail(namn, swishNummer = '') {
  const förnamn = namn.split(' ')[0]
  const swishMeddelande = `VM-Tips-${namn.replace(/\s+/g, '-')}`
  return {
    subject: '🍷 Glöm inte din vinflaska — VM-tipsen 2026',
    html: wrap(`
      <h2 style="color:#0a1628;margin-bottom:8px">Hej ${förnamn}! 👋</h2>
      <p style="color:#555;line-height:1.7">
        Du är anmäld till VM-tipsen 2026 — men vi saknar fortfarande din vinflaska.
        Utan en registrerad flaska är du inte med i vinpotten!
      </p>

      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 12px;font-family:sans-serif">Vad behöver du göra?</p>

        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="font-size:1.1rem">🍷</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">1. Välj din vinflaska</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">Välj en flaska mellan 180–220 kr på Systembolaget och lägg in länken under <em>Min vinflaska</em>.</p>
          </div>
        </div>

        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0">
          <span style="font-size:1.1rem">💸</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">2. Swisha insatsen</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">Vinpriset + 10 kr i adminavgift. Märk med <strong>${swishMeddelande}</strong>.</p>
          </div>
        </div>
      </div>

      ${swishNummer ? `
      <div style="background:#0a1628;border-radius:10px;padding:16px;margin:16px 0;text-align:center">
        <p style="color:rgba(255,255,255,0.45);font-size:0.68rem;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 4px">Swisha till</p>
        <p style="color:#fff;font-size:1.4rem;font-weight:700;letter-spacing:0.06em;margin:0 0 10px">${swishNummer}</p>
        <p style="color:rgba(255,255,255,0.45);font-size:0.68rem;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 4px">Swish-meddelande</p>
        <p style="color:#F0D060;font-size:1rem;font-weight:700;letter-spacing:0.06em;margin:0">${swishMeddelande}</p>
      </div>
      ` : ''}

      <div style="background:rgba(200,16,46,0.05);border:1px solid rgba(200,16,46,0.15);border-radius:10px;padding:14px 16px;margin:16px 0">
        <p style="color:#C8102E;font-size:0.85rem;font-weight:600;margin:0 0 4px">⏰ Glöm inte deadline!</p>
        <p style="color:#555;font-size:0.82rem;margin:0;line-height:1.6">
          Gruppspelets tippar låser den <strong>11 juni</strong>. Se till att du har valt och betalt din vinflaska innan dess för att vara med i tävlingen.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/mitt-vin"
           style="display:inline-block;background:linear-gradient(135deg,#C8102E,#e01535);color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.9rem;font-family:sans-serif">
          VÄLJ MIN VINFLASKA 🍷
        </a>
      </div>

      <p style="color:#aaa;font-size:0.78rem;text-align:center;line-height:1.6">
        Har du redan valt och betalat? Ignorera detta mail — adminen bekräftar betalningar manuellt och det kan ta någon dag.
      </p>
    `),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async (req) => {
  // Security first — all methods require admin auth
  if (!verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Ej behörig' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sheets = await getSheets()

    // Load settings + both sheets in parallel
    const [settings, användareRader, vinerRader] = await Promise.all([
      getSettings().catch(() => ({})),
      getRows(sheets, 'Användare!A2:C1000'),
      getRows(sheets, 'Viner!A2:F1000'),
    ])
    const swishNummer = settings.swish_nummer || ''

    // Build a Set of user_ids that have a wine entry
    const harVin = new Set(vinerRader.map((r) => r[0]).filter(Boolean))

    // Find participants without a wine entry
    const utanVin = användareRader
      .filter((r) => r[0] && !harVin.has(r[0]))
      .map((r) => ({
        user_id: r[0],
        namn:    r[1] || 'Deltagare',
        email:   r[2] || null,
      }))
      .filter((p) => p.email) // only people we can email

    // ── GET: return list only ────────────────────────────────
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          utan_vin: utanVin,
          antal:    utanVin.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── POST: send reminder emails ───────────────────────────
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const { user_ids, all } = body

      // Decide who to send to
      let mottagare = []
      if (all === true) {
        mottagare = utanVin
      } else if (Array.isArray(user_ids) && user_ids.length > 0) {
        const idSet = new Set(user_ids)
        mottagare = utanVin.filter((p) => idSet.has(p.user_id))
      } else {
        return new Response(
          JSON.stringify({ error: 'Ange antingen { all: true } eller { user_ids: [...] }' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (mottagare.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Inga mottagare att skicka till.', skickade: 0, misslyckade: 0 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Send emails concurrently (with settled promises so one failure won't abort others)
      const results = await Promise.allSettled(
        mottagare.map(async (p) => {
          const { subject, html } = vinPåminnelseMail(p.namn, swishNummer)
          await skickaMail(p.email, subject, html)
          return p.user_id
        })
      )

      const skickade    = results.filter((r) => r.status === 'fulfilled').length
      const misslyckade = results.filter((r) => r.status === 'rejected').length

      // Log failures for debugging without exposing them to client
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[admin-påminnelse] Misslyckades skicka till ${mottagare[i]?.email}:`, r.reason?.message)
        }
      })

      return new Response(
        JSON.stringify({
          message:     `${skickade} påminnelse${skickade !== 1 ? 'r' : ''} skickad${skickade !== 1 ? 'e' : ''}.`,
          skickade,
          misslyckade,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Method Not Allowed', { status: 405 })
  } catch (err) {
    console.error('[admin-påminnelse] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}