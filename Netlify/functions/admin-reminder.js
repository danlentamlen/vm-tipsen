/**
 * admin-reminder.js
 *
 * Sends a reminder email to one or more participants.
 *
 * Body:
 *   { user_ids: string[], type: 'group' | 'knockout', round?: string }
 *
 * type='group'    → Reminder about group stage + questions deadline (June 11, 16:00 CEST)
 * type='knockout' → Reminder about a specific knockout round closing soon
 *                   round = e.g. 'Round of 16'
 *
 * Auth: Bearer admin secret required.
 */
import { getSheets, getRows } from './_sheets.js'
import { skickaMail } from './_mail.js'
import { getMatcher } from './_lockedData.js'
import { beräknaOmgångsDeadline } from './_settings.js'

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

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

const ROUND_LABELS = {
  'Round of 32':           'Sextondelsfinalerna',
  'Round of 16':           'Åttondelsfinaler',
  'Quarter-final':         'Kvartsfinaler',
  'Semi-final':            'Semifinaler',
  'Match for third place': 'Bronsmatch',
  'Final':                 'Final',
}

/**
 * Formaterar en Date till "d MMMM HH:MM" på svenska i CEST-tid.
 * Exempel: new Date('2026-07-07T22:00Z') → "7 juli 20:00"
 */
function formateraDeadline(date) {
  if (!date) return 'se hemsidan'
  const opts = { timeZone: 'Europe/Stockholm' }
  const dag = new Intl.DateTimeFormat('sv-SE', { ...opts, day: 'numeric', month: 'long' }).format(date)
  const tid = new Intl.DateTimeFormat('sv-SE', { ...opts, hour: '2-digit', minute: '2-digit' }).format(date)
  return `${dag} ${tid}`
}

function groupReminderMail(namn) {
  const förnamn = namn.split(' ')[0]
  return {
    subject: '⏰ Påminnelse: Tippa klart innan 11 juni kl 16:00!',
    html: wrap(`
      <h2 style="color:#0a1628;margin-bottom:8px">Hej ${förnamn}! 👋</h2>
      <p style="color:#555;line-height:1.7">
        Snart stänger tipsen för <strong>gruppspelet och tilläggsfrågorna</strong> i VM-tipsen 2026.
        Se till att du har fyllt i alla dina tips innan deadline!
      </p>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#856404;margin:0 0 8px;font-family:sans-serif">⏰ Deadline</p>
        <p style="color:#0a1628;font-weight:700;font-size:1.1rem;margin:0">Onsdag 11 juni kl 16:00 (CEST)</p>
        <p style="color:#777;font-size:0.82rem;margin:4px 0 0">Efter det kan du inte längre ändra dina tips för gruppspelet eller svara på tilläggsfrågor.</p>
      </div>

      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 12px;font-family:sans-serif">Glöm inte att tippa</p>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="font-size:1.1rem">⚽</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">Gruppspelsmatcherna</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">72 matcher att tippa — varje rätt tips ger poäng!</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0">
          <span style="font-size:1.1rem">🎯</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">Tilläggsfrågorna</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">Svara på bonusfrågorna för extra poäng — de låses permanent den 11 juni.</p>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/matches"
           style="display:inline-block;background:#C8102E;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem;margin-right:8px">
          TIPPA MATCHER →
        </a>
        <a href="${SITE_URL}/questions"
           style="display:inline-block;background:#0a1628;color:#F0D060;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem">
          TILLÄGGSFRÅGOR →
        </a>
      </div>

      <p style="color:#aaa;font-size:0.78rem;text-align:center;line-height:1.6">
        Lycka till! 🏆
      </p>
    `),
  }
}

function knockoutReminderMail(namn, round, deadline) {
  const förnamn = namn.split(' ')[0]
  const roundLabel = ROUND_LABELS[round] || round
  return {
    subject: `⏰ Tipsen för ${roundLabel} stänger snart!`,
    html: wrap(`
      <h2 style="color:#0a1628;margin-bottom:8px">Hej ${förnamn}! 👋</h2>
      <p style="color:#555;line-height:1.7">
        Tipsen för <strong>${roundLabel}</strong> i VM-tipsen 2026 stänger snart.
        Se till att du har lagt dina tips för matcherna i den här omgången!
      </p>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#856404;margin:0 0 8px;font-family:sans-serif">⏰ Deadline</p>
        <p style="color:#0a1628;font-weight:700;font-size:1.1rem;margin:0">${deadline} (CEST)</p>
        <p style="color:#777;font-size:0.82rem;margin:4px 0 0">Tips låses 2 timmar innan den första matchen i omgången.</p>
      </div>

      <p style="color:#555;line-height:1.7;font-size:0.9rem">
        Inga tips = inga poäng för den här omgången — tippa nu för att hålla dig kvar i toppstriden! 💪
      </p>

      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/matches"
           style="display:inline-block;background:#C8102E;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem">
          TIPPA ${roundLabel.toUpperCase()} →
        </a>
      </div>

      <p style="color:#aaa;font-size:0.78rem;text-align:center;line-height:1.6">
        Lycka till! 🏆
      </p>
    `),
  }
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
    const { user_ids, all, type, round } = await req.json()

    if (!all && (!Array.isArray(user_ids) || user_ids.length === 0)) {
      return new Response(JSON.stringify({ error: 'Ange antingen { all: true } eller { user_ids: [...] }' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!['group', 'knockout'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Ogiltigt type-värde' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (type === 'knockout' && !round) {
      return new Response(JSON.stringify({ error: 'round krävs för knockout-påminnelse' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const sheets = await getSheets()
    const användareRader = await getRows(sheets, 'Användare!A2:C1000')

    // Beräkna knockout-deadline dynamiskt från matchdata
    let knockoutDeadlineStr = 'se hemsidan'
    if (type === 'knockout') {
      const matchRader = await getMatcher()
      const allaMatcher = matchRader.map((r) => ({
        match_id: r[0], datum: r[1], tid: r[2],
        hemmalag: r[3], bortalag: r[4], grupp: r[5], omgång: r[6],
      }))
      const deadline = beräknaOmgångsDeadline(round, allaMatcher)
      knockoutDeadlineStr = formateraDeadline(deadline)
    }

    // Om all:true — skicka till samtliga användare med e-post
    const målIds = all === true
      ? new Set(användareRader.map((r) => r[0]).filter(Boolean))
      : new Set(user_ids)

    const results = []
    for (const rad of användareRader) {
      const uid = rad[0]
      if (!uid || !målIds.has(uid)) continue
      const namn = rad[1]
      const email = rad[2]
      if (!email) {
        results.push({ user_id: uid, ok: false, error: 'Ingen e-postadress' })
        continue
      }

      const { subject, html } =
        type === 'group'
          ? groupReminderMail(namn)
          : knockoutReminderMail(namn, round, knockoutDeadlineStr)

      try {
        await skickaMail(email, subject, html)
        results.push({ user_id: uid, namn, ok: true })
      } catch (err) {
        results.push({ user_id: uid, namn, ok: false, error: err.message })
      }
    }

    const skickade = results.filter((r) => r.ok).length
    return new Response(
      JSON.stringify({ message: `${skickade}/${results.length} mail skickade`, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-reminder] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
