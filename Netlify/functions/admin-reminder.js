/**
 * admin-reminder.js
 *
 * Sends a reminder email to one or more participants.
 *
 * Body:
 *   { user_ids: string[], type: 'group' | 'knockout', round?: string, batch_id?: string }
 *
 * type='group'    → Reminder about group stage + questions deadline (June 11, 16:00 CEST)
 * type='knockout' → Reminder about a specific knockout round closing soon
 *                   round = e.g. 'Round of 16'
 * batch_id        → Idempotens-nyckel. Varje skickat mail loggas i fliken
 *                   Maillogg med sitt batch_id. Anrop med samma batch_id
 *                   hoppar över redan loggade mottagare — klienten kan
 *                   därmed säkert köra om/återuppta utan dubblettmail.
 *
 * Auth: Bearer admin secret required.
 */
import { getSheets, getRows, appendRow, ensureSheet } from './_sheets.js'
import { skickaMail, skapaPooladTransporter } from './_mail.js'
import { getMatcher } from './_lockedData.js'
import { beräknaOmgångsDeadline } from './_settings.js'

// Hur länge vi som mest skickar innan vi returnerar och låter klienten
// återuppta med `remaining`. Netlifys synkrona funktioner dödas vid 10s —
// budget + max ett mail-timeout (PER_MAIL_TIMEOUT_MS) måste hålla oss under.
const TIME_BUDGET_MS = 6500

// Max väntan per enskilt mail. Utan denna kan ETT hängande SMTP-anrop få
// Netlify att döda hela funktionen vid 10s → klienten får trasigt svar och
// vet inte vilka som fått mail. Timeout → mottagaren läggs i failed och
// klienten kan försöka igen.
const PER_MAIL_TIMEOUT_MS = 2500

const MAILLOGG_FLIK = 'Maillogg'

// Modulcache: har vi säkerställt att Maillogg-fliken finns? (varm funktion
// slipper extra API-anrop)
let mailloggFinns = false

/** Kör en promise med timeout — kastar Error('timeout') om den drar över. */
export function medTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Mail-timeout efter ${ms}ms`)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * Ren funktion (testbar): filtrera bort mottagare som redan loggats
 * i Maillogg för det aktuella batch_id:t.
 * Loggrad = [batch_id, user_id, type, round, tidsstämpel].
 *
 * @returns {{ kvar: object[], redanSkickade: string[] }}
 */
export function filtreraRedanSkickade(mottagare, loggRader, batchId) {
  if (!batchId) return { kvar: mottagare, redanSkickade: [] }
  const skickadeIds = new Set(
    (loggRader || [])
      .filter((r) => r?.[0] === batchId && r?.[1])
      .map((r) => r[1])
  )
  const kvar = []
  const redanSkickade = []
  for (const m of mottagare) {
    if (skickadeIds.has(m.user_id)) redanSkickade.push(m.user_id)
    else kvar.push(m)
  }
  return { kvar, redanSkickade }
}

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

/**
 * Ren funktion (testbar): bestäm vilka som ska få mail utifrån Användare-rader.
 * Rad = [user_id, namn, email].
 *
 * @returns {{ mottagare: {user_id,namn,email}[], utanEpost: string[] }}
 *   mottagare = de med giltig e-post, i sheet-ordning
 *   utanEpost = user_ids som matchade men saknar e-post (rapporteras som failed)
 */
export function planeraMottagare(användareRader, { all, user_ids }) {
  const målIds = all === true
    ? null // null = alla
    : new Set(Array.isArray(user_ids) ? user_ids : [])

  const mottagare = []
  const utanEpost = []
  for (const rad of användareRader) {
    const uid = rad?.[0]
    if (!uid) continue
    if (målIds && !målIds.has(uid)) continue
    const email = rad[2]
    if (!email) { utanEpost.push(uid); continue }
    mottagare.push({ user_id: uid, namn: rad[1] || 'Deltagare', email })
  }
  return { mottagare, utanEpost }
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
    const { user_ids, all, type, round, batch_id } = await req.json()

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

    const { mottagare: allaMottagare, utanEpost } = planeraMottagare(användareRader, { all, user_ids })

    // Idempotens: hoppa över mottagare som redan loggats i Maillogg för
    // detta batch_id (skyddar mot dubblettmail när klienten kör om).
    let mottagare = allaMottagare
    let redanSkickade = []
    if (batch_id) {
      if (!mailloggFinns) {
        await ensureSheet(sheets, MAILLOGG_FLIK)
        mailloggFinns = true
      }
      const loggRader = await getRows(sheets, `${MAILLOGG_FLIK}!A1:B10000`)
      ;({ kvar: mottagare, redanSkickade } = filtreraRedanSkickade(allaMottagare, loggRader, batch_id))
    }

    const total = allaMottagare.length + utanEpost.length

    // De utan e-post rapporteras direkt som misslyckade (aldrig i remaining)
    const failed = utanEpost.map((uid) => ({ user_id: uid, error: 'Ingen e-postadress' }))
    const sent = []

    // Poolad SMTP-anslutning för hela batchen (snabbare än en per mail)
    const transporter = skapaPooladTransporter()
    const start = Date.now()
    let stannadeIdx = mottagare.length // hur långt vi hann

    try {
      for (let i = 0; i < mottagare.length; i++) {
        // Tidsbudget: lämna resten till nästa anrop innan Netlify dödar oss
        if (Date.now() - start > TIME_BUDGET_MS) { stannadeIdx = i; break }

        const p = mottagare[i]
        const { subject, html } =
          type === 'group'
            ? groupReminderMail(p.namn)
            : knockoutReminderMail(p.namn, round, knockoutDeadlineStr)

        try {
          await medTimeout(skickaMail(p.email, subject, html, transporter), PER_MAIL_TIMEOUT_MS)
          sent.push(p.user_id)
          // Logga direkt efter lyckad sändning → omkörning med samma
          // batch_id skickar aldrig om till denna mottagare.
          if (batch_id) {
            try {
              await appendRow(sheets, `${MAILLOGG_FLIK}!A:E`, [
                batch_id, p.user_id, type, round || '', new Date().toISOString(),
              ])
            } catch (loggErr) {
              // Loggfel får inte stoppa utskicket — värsta fallet är att
              // en omkörning skickar ett extra mail till denna person.
              console.warn('[admin-reminder] kunde inte logga:', loggErr.message)
            }
          }
        } catch (err) {
          failed.push({ user_id: p.user_id, namn: p.namn, error: err.message })
        }
      }
    } finally {
      transporter.close()
    }

    // Allt som ligger kvar efter där vi stannade → klienten återupptar med dessa
    const remaining = mottagare.slice(stannadeIdx).map((p) => p.user_id)
    const done = remaining.length === 0
    const skickatTotalt = sent.length + redanSkickade.length

    return new Response(
      JSON.stringify({
        done,
        total,
        sent,
        alreadySent: redanSkickade,
        failed,
        remaining,
        message: `${skickatTotalt}/${total} mail skickade${done ? '' : ' — fortsätter…'}`,
      }),
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
