// Delad mailhjälp — används av auth-register, viner-spara och admin-kvitto
import nodemailer from 'nodemailer'

export function skapaTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
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

// ── Välkomstmail vid registrering ──────────────────────────
export function välkomstMail(namn) {
  const förnamn = namn.split(' ')[0]
  return {
    subject: '🎉 Välkommen till VM-tipsen 2026!',
    html: wrap(`
      <h2 style="color:#0a1628;margin-bottom:8px">Välkommen, ${förnamn}! 🎉</h2>
      <p style="color:#555;line-height:1.7">
        Ditt konto är skapat och du är nu med i VM-tipsen 2026.
        Nästa steg är att välja din vinflaska och swisha insatsen.
      </p>

      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 12px;font-family:sans-serif">Vad händer nu?</p>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="font-size:1.1rem">🍷</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">Välj din vinflaska</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">Välj en flaska mellan 180–220 kr på Systembolaget och lägg in länken.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="font-size:1.1rem">💸</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">Swisha insatsen</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">Vinpriset + 10 kr i adminavgift. Märk med <strong>VM-Tips-${namn.replace(/\s+/g, '-')}</strong>.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0">
          <span style="font-size:1.1rem">⚽</span>
          <div>
            <p style="margin:0;font-weight:600;color:#0a1628;font-size:0.88rem">Tippa matcherna</p>
            <p style="margin:4px 0 0;color:#777;font-size:0.82rem">104 matcher att tippa — och tilläggsfrågor att svara på!</p>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/mitt-vin"
           style="display:inline-block;background:#C8102E;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem">
          VÄLJ DIN VINFLASKA →
        </a>
      </div>
    `),
  }
}

// ── Bekräftelsemail vid vinval ──────────────────────────────
export function vinBekräftelseMail(namn, vinNamn, vinUrl, vinPris, erUppdatering) {
  const förnamn = namn.split(' ')[0]
  const total = vinPris ? Number(vinPris) + 10 : null
  const swishMeddelande = `VM-Tips-${namn.replace(/\s+/g, '-')}`

  return {
    subject: erUppdatering
      ? '🍷 Din vinflaska är uppdaterad — VM-tipsen 2026'
      : '🍷 Vinflaska vald — kom ihåg att swisha!',
    html: wrap(`
      <h2 style="color:#0a1628;margin-bottom:8px">
        ${erUppdatering ? `Hej ${förnamn}, din vinflaska är uppdaterad!` : `Perfekt val, ${förnamn}! 🍷`}
      </h2>
      <p style="color:#555;line-height:1.7">
        ${erUppdatering
          ? 'Din vinflaska i VM-tipsen 2026 har uppdaterats.'
          : 'Du har valt din vinflaska. Nu återstår bara att swisha insatsen så är du redo!'}
      </p>

      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
        <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 12px">Din vinflaska</p>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="color:#555;font-size:0.88rem">🍷 ${vinNamn}</span>
          <span style="color:#0a1628;font-weight:600;font-size:0.88rem">${vinPris} kr</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <span style="color:#555;font-size:0.88rem">⚙️ Adminavgift</span>
          <span style="color:#0a1628;font-weight:600;font-size:0.88rem">10 kr</span>
        </div>
        ${total ? `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0">
          <span style="color:#0a1628;font-weight:700;font-size:0.88rem">Att swisha</span>
          <span style="color:#C8102E;font-weight:700;font-size:1.1rem">${total} kr</span>
        </div>` : ''}
      </div>

      <div style="background:#0a1628;border-radius:10px;padding:16px;margin:16px 0;text-align:center">
        <p style="color:rgba(255,255,255,0.45);font-size:0.68rem;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 6px">Swish-meddelande</p>
        <p style="color:#F0D060;font-size:1.1rem;font-weight:700;letter-spacing:0.06em;margin:0">${swishMeddelande}</p>
      </div>

      <p style="color:#777;font-size:0.82rem;line-height:1.6;text-align:center">
        Du kan se ditt vin och swish-instruktioner på
        <a href="${SITE_URL}/mitt-vin" style="color:#C8102E">Min vinflaska</a>.
      </p>

      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/matches"
           style="display:inline-block;background:#C8102E;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem">
          TIPPA MATCHER →
        </a>
      </div>
    `),
  }
}

// ── Betalningskvitto (används av admin-kvitto.js) ───────────
export function betalningsMail(namn, vinNamn, vinPris, status) {
  const förnamn = namn.split(' ')[0]

  if (status === 'betalt') {
    const total = vinPris ? Number(vinPris) + 10 : null
    return {
      subject: '✅ Betalning mottagen — VM-tipsen 2026',
      html: wrap(`
        <h2 style="color:#0a1628;margin-bottom:8px">Hej ${förnamn}! 🎉</h2>
        <p style="color:#555;line-height:1.7">Vi har tagit emot din betalning. Du är nu fullt registrerad i VM-tipsen 2026!</p>

        <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
          <p style="font-size:0.7rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 12px">Kvitto</p>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <span style="color:#555;font-size:0.88rem">🍷 ${vinNamn}</span>
            <span style="color:#0a1628;font-weight:600;font-size:0.88rem">${vinPris} kr</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <span style="color:#555;font-size:0.88rem">⚙️ Adminavgift</span>
            <span style="color:#0a1628;font-weight:600;font-size:0.88rem">10 kr</span>
          </div>
          ${total ? `
          <div style="display:flex;justify-content:space-between;padding:10px 0 0">
            <span style="color:#0a1628;font-weight:700;font-size:0.88rem">Totalt betalt</span>
            <span style="color:#C8102E;font-weight:700;font-size:1.1rem">${total} kr</span>
          </div>` : ''}
        </div>

        <div style="text-align:center;margin:24px 0">
          <a href="${SITE_URL}/matches"
             style="display:inline-block;background:#C8102E;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-size:0.88rem">
            TIPPA MATCHER →
          </a>
        </div>
      `),
    }
  }

  if (status === 'återbetald') {
    return {
      subject: '↩️ Återbetalning — VM-tipsen 2026',
      html: wrap(`
        <h2 style="color:#0a1628">Hej ${förnamn},</h2>
        <p style="color:#555;line-height:1.7">
          Din betalning för VM-tipsen 2026 har återbetalats.
          Ditt vin <strong>${vinNamn}</strong> har tagits bort från vinpotten.
        </p>
        <p style="color:#555;line-height:1.7">Har du frågor? Hör av dig!</p>
      `),
    }
  }

  return {
    subject: '⏳ Påminnelse: Betalning saknas — VM-tipsen 2026',
    html: wrap(`
      <h2 style="color:#0a1628">Hej ${förnamn},</h2>
      <p style="color:#555;line-height:1.7">
        Vi saknar fortfarande din betalning för VM-tipsen 2026.
        Swisha insatsen för att bekräfta din plats.
      </p>
      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:20px 0">
        <p style="color:#555;font-size:0.88rem;margin:0 0 6px"><strong>Ditt vin:</strong> ${vinNamn} (${vinPris} kr)</p>
        <p style="color:#555;font-size:0.88rem;margin:0"><strong>Att swisha:</strong> ${vinPris ? Number(vinPris) + 10 : '?'} kr</p>
      </div>
    `),
  }
}

// ── Skicka mail ─────────────────────────────────────────────
export async function skickaMail(till, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[mail] GMAIL_USER eller GMAIL_APP_PASSWORD saknas — mail skickas ej')
    return
  }
  const transporter = skapaTransporter()
  await transporter.sendMail({
    from: `VM-tipsen 2026 <${process.env.GMAIL_USER}>`,
    to: till,
    subject,
    html,
  })
  console.log(`[mail] Skickat till ${till}: ${subject}`)
}