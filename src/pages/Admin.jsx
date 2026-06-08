import { useState, useEffect } from 'react'
import AdminVinReminder from '../components/AdminVinReminder'
import AdminBetStatus from './AdminBetStatus'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .adm-wrap { max-width:900px; margin:0 auto; padding:2rem 1rem 5rem; }
  .adm-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .adm-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  .adm-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .adm-card-title { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0a1628; margin-bottom:1rem; }
  
  /* Login */
  .adm-login-page { min-height:calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding:2rem 1rem; }
  .adm-login-card { background:#fff; border-radius:16px; padding:2.5rem 2rem; width:100%; max-width:360px; box-shadow:0 8px 32px rgba(0,0,0,.1); border:1px solid rgba(0,0,0,.07); }
  .adm-login-icon { font-size:2rem; margin-bottom:1rem; text-align:center; }
  .adm-login-title { font-family:'Barlow Condensed',sans-serif; font-size:1.5rem; font-weight:700; color:#0a1628; text-align:center; margin-bottom:1.5rem; }
  .adm-login-err { background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#8a1020; margin-bottom:1rem; }
  .adm-login-input { width:100%; padding:11px 14px; font-family:'Barlow',sans-serif; font-size:.95rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; outline:none; box-sizing:border-box; margin-bottom:.75rem; }
  .adm-login-input:focus { border-color:#C5A028; }
  .adm-login-btn { width:100%; padding:12px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; border:none; border-radius:8px; cursor:pointer; }
  .adm-login-btn:hover { opacity:.88; }

  /* Lock row */
  .adm-lock-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .adm-lock-status { font-family:'Barlow',sans-serif; font-size:.9rem; color:#555; margin:0; }

  /* Buttons */
  .adm-btn { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:9px 20px; border:none; border-radius:8px; cursor:pointer; transition:opacity .15s; }
  .adm-btn.danger  { background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; }
  .adm-btn.success { background:linear-gradient(135deg,#1a6b35,#2a9a50); color:#fff; }
  .adm-btn:hover { opacity:.85; }
  .adm-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* Summary */
  .adm-summary { display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
  .adm-summary-item { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:10px; padding:.875rem 1rem; flex:1; min-width:90px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .adm-summary-val { font-family:'Barlow Condensed',sans-serif; font-size:1.5rem; font-weight:700; color:#0a1628; line-height:1; }
  .adm-summary-lbl { font-size:.63rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#aaa; margin-top:3px; display:block; }

  /* Grupp-separator — nu en <tr> inuti tabellen */
  .adm-group-row td {
    padding: .875rem .75rem .4rem;
    border-bottom: none;
    background: transparent;
  }
  .adm-group-row:first-child td { padding-top: 0; }
  .adm-group-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    padding: 3px 12px; border-radius:100px;
  }
  .adm-group-pill.ej { background:rgba(197,160,40,.12); color:#7a5c10; border:1px solid rgba(197,160,40,.3); }
  .adm-group-pill.ok { background:rgba(10,22,40,.07); color:#0a1628; border:1px solid rgba(10,22,40,.15); }
  .adm-group-count { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; color:#aaa; margin-left:.5rem; }

  /* Table */
  .adm-table { width:100%; border-collapse:collapse; }
  .adm-table th { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:#aaa; text-align:left; padding:.5rem .75rem; border-bottom:1px solid rgba(0,0,0,.07); }
  .adm-table td { padding:.75rem; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:middle; }
  .adm-table tr:last-child td { border-bottom:none; }
  .adm-table tr:not(.adm-group-row):hover td { background:#fafaf8; }

  .adm-navn { font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .adm-vin-link { font-family:'Barlow',sans-serif; font-size:.82rem; color:#C5A028; text-decoration:none; }
  .adm-vin-link:hover { text-decoration:underline; }
  .adm-vin-none { font-size:.82rem; color:#ccc; font-style:italic; }
  .adm-pris { font-family:'Barlow Condensed',sans-serif; font-size:.9rem; color:#555; }

  .adm-status-select { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:600; letter-spacing:.06em; padding:5px 10px; border:1.5px solid rgba(0,0,0,.12); border-radius:7px; background:#fff; color:#0a1628; outline:none; cursor:pointer; transition:border-color .15s; }
  .adm-status-select:focus { border-color:#C5A028; }

  .adm-actions { display:flex; gap:6px; flex-wrap:wrap; }
  .adm-action-btn { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:5px 10px; border-radius:6px; border:none; cursor:pointer; white-space:nowrap; transition:all .15s; }
  .adm-action-btn.save { background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; }
  .adm-action-btn.mail { background:rgba(197,160,40,.1); color:#7a5c10; border:1px solid rgba(197,160,40,.3); }
  .adm-action-btn:hover:not(:disabled) { opacity:.85; }
  .adm-action-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* Toast */
  .adm-toast { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:#0a1628; color:#F0D060; font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; letter-spacing:.08em; padding:.875rem 1.75rem; border-radius:100px; box-shadow:0 8px 24px rgba(0,0,0,.25); z-index:999; white-space:nowrap; }

  @media (max-width:640px) {
    .adm-table th:nth-child(3), .adm-table td:nth-child(3) { display:none; }
    .adm-actions { flex-direction:column; }
  }
`

// ── Betalningstabell — grupprader är nu <tr> för giltig HTML ─
function VinTabell({ rader, grupp, pendingStatus, setPendingStatus, sparar, sänderMail, sparaStatus, skickaKvitto }) {
  if (rader.length === 0) return null

  const pillKlass = grupp === 'ej' ? 'ej' : 'ok'
  const pillText  = grupp === 'ej' ? '⏳ Ej betalt' : '✅ Betalt / Återbetalt'

  return (
    <>
      {/* FIX: Grupprubrik som <tr> + <td colspan> — giltig HTML i <tbody> */}
      <tr className="adm-group-row">
        <td colSpan={5}>
          <span className={`adm-group-pill ${pillKlass}`}>{pillText}</span>
          <span className="adm-group-count">{rader.length} st</span>
        </td>
      </tr>

      {rader.map((v) => {
        const nuvarandeStatus = v.betalt || 'ej_betalt'
        const valdStatus  = pendingStatus[v.user_id] ?? nuvarandeStatus
        const harÄndrat   = pendingStatus[v.user_id] && pendingStatus[v.user_id] !== nuvarandeStatus
        return (
          <tr key={v.user_id}>
            <td><span className="adm-navn">{v.namn}</span></td>
            <td>
              {v.vin_namn
                ? <a href={v.vin_url} target="_blank" rel="noopener noreferrer" className="adm-vin-link">{v.vin_namn}</a>
                : <span className="adm-vin-none">Ej valt</span>}
            </td>
            <td><span className="adm-pris">{v.vin_pris ? `${v.vin_pris} kr` : '—'}</span></td>
            <td>
              <select
                className="adm-status-select"
                value={valdStatus}
                onChange={(e) => setPendingStatus((prev) => ({ ...prev, [v.user_id]: e.target.value }))}
                disabled={sparar === v.user_id}
              >
                <option value="ej_betalt">⏳ Ej betalt</option>
                <option value="betalt">✅ Betalt</option>
                <option value="återbetald">↩️ Återbetald</option>
              </select>
            </td>
            <td>
              <div className="adm-actions">
                <button
                  onClick={() => sparaStatus(v.user_id)}
                  disabled={!harÄndrat || sparar === v.user_id}
                  className="adm-action-btn save"
                >
                  {sparar === v.user_id ? '...' : 'Spara'}
                </button>
                {v.vin_namn && (
                  <button
                    onClick={() => skickaKvitto(v.user_id)}
                    disabled={sänderMail === v.user_id}
                    className="adm-action-btn mail"
                  >
                    {sänderMail === v.user_id ? '...' : '📧 Kvitto'}
                  </button>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}

export default function Admin() {
  const [lösenord, setLösenord]             = useState('')
  const [inloggad, setInloggad]             = useState(() => !!sessionStorage.getItem('admin_secret'))
  const [adminSecret, setAdminSecret]       = useState(() => sessionStorage.getItem('admin_secret'))
  const [fel, setFel]                       = useState(null)
  const [settings, setSettings]             = useState(null)
  const [viner, setViner]                   = useState([])
  const [pendingStatus, setPendingStatus]   = useState({})
  const [sparar, setSparar]                 = useState(null)
  const [sänderMail, setSänderMail]         = useState(null)
  const [toast, setToast]                   = useState(null)

  function visaToast(text, ms = 3500) { setToast(text); setTimeout(() => setToast(null), ms) }

  useEffect(() => {
    if (inloggad && adminSecret) { hämtaSettings(); hämtaViner() }
  }, [inloggad])

  async function logga_in(e) {
    e.preventDefault(); setFel(null)
    const res = await fetch('/.netlify/functions/admin', { headers: { Authorization: `Bearer ${lösenord}` } }).catch(() => null)
    if (res?.ok) {
      sessionStorage.setItem('admin_secret', lösenord)
      setAdminSecret(lösenord); setInloggad(true); setLösenord('')
    } else { setFel('Fel lösenord') }
  }

  async function hämtaSettings() {
    const res = await fetch('/.netlify/functions/admin', { headers: { Authorization: `Bearer ${adminSecret}` } }).catch(() => null)
    if (res?.status === 401) { logga_ut(); return }
    if (res?.ok) setSettings(await res.json())
  }

  async function hämtaViner() {
    const res = await fetch('/.netlify/functions/viner-hamta').catch(() => null)
    if (res?.ok) { const d = await res.json(); setViner(Array.isArray(d) ? d : []) }
  }

  function logga_ut() {
    sessionStorage.removeItem('admin_secret')
    setInloggad(false); setAdminSecret(null); setSettings(null); setViner([])
  }

  async function toggleLås() {
    const nyttVärde = settings?.tips_låst === 'true' ? 'false' : 'true'
    await fetch('/.netlify/functions/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ nyckel: 'tips_låst', värde: nyttVärde }),
    }).catch(() => {})
    visaToast(nyttVärde === 'true' ? '🔒 Tips låsta!' : '🔓 Tips upplåsta!')
    hämtaSettings()
  }

  async function sparaStatus(user_id) {
    const status = pendingStatus[user_id]
    if (!status) return
    setSparar(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-betalning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_id, status }),
      })
      if (res.ok) {
        if (status === 'återbetald') {
          setViner(prev => prev.filter(v => v.user_id !== user_id))
        } else {
          setViner(prev => prev.map(v => v.user_id === user_id ? { ...v, betalt: status } : v))
        }
        setPendingStatus(prev => { const n = { ...prev }; delete n[user_id]; return n })

        if (status === 'betalt' || status === 'återbetald') {
          fetch('/.netlify/functions/admin-kvitto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
            body: JSON.stringify({ user_id, status }),
          })
          .then(r => r.json())
          .then(() => visaToast(status === 'återbetald' ? '↩️ Vin raderat och mail skickat' : '✅ Betalt sparat — mail skickat 📧'))
          .catch(() => visaToast(status === 'återbetald' ? '↩️ Vin raderat (mail misslyckades)' : '✅ Betalt sparat (mail misslyckades)'))
        } else {
          visaToast('✅ Status uppdaterad')
        }
      } else { visaToast('❌ Något gick fel') }
    } catch { visaToast('❌ Något gick fel') }
    setSparar(null)
  }

  async function skickaKvitto(user_id) {
    const vin = viner.find(v => v.user_id === user_id)
    if (!vin) return
    setSänderMail(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-kvitto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_id, status: vin.betalt }),
      })
      const d = await res.json()
      visaToast(res.ok ? `📧 Mail skickat till ${vin.namn}` : `❌ ${d.error || 'Kunde inte skicka mail'}`)
    } catch { visaToast('❌ Kunde inte skicka mail') }
    setSänderMail(null)
  }

  const ejBetalt      = viner.filter(v => !v.betalt || v.betalt === 'ej_betalt')
  const betaltOchÅter = viner.filter(v => v.betalt === 'betalt' || v.betalt === 'återbetald')
  const totalBetalt     = viner.filter(v => v.betalt === 'betalt').length
  const totalEjBetalt   = ejBetalt.length
  const totalÅterbetald = viner.filter(v => v.betalt === 'återbetald').length
  const pottVärde       = viner.filter(v => v.betalt === 'betalt').reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)

  const tabellProps = { pendingStatus, setPendingStatus, sparar, sänderMail, sparaStatus, skickaKvitto }

  if (!inloggad) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="adm-login-page">
          <div className="adm-login-card">
            <div className="adm-login-icon">⚙️</div>
            <h1 className="adm-login-title">Adminpanel</h1>
            <form onSubmit={logga_in}>
              {fel && <div className="adm-login-err">{fel}</div>}
              <input type="password" value={lösenord} onChange={e => setLösenord(e.target.value)} placeholder="Lösenord" required className="adm-login-input" />
              <button type="submit" className="adm-login-btn">Logga in</button>
            </form>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="adm-wrap">
        <p className="adm-eyebrow">VM-tipsen 2026</p>
        <h1 className="adm-title">Adminpanel</h1>

        <a
          href="/admin/tipsstatus"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: '.78rem',
            fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            padding: '8px 16px', borderRadius: 8, marginBottom: '1.5rem',
            background: 'linear-gradient(135deg,#0a1628,#1a2e4a)', color: '#F0D060',
            textDecoration: 'none',
        }}
      >
        📊 Tipsstatus &amp; Påminnelser →
      </a>

        <button onClick={logga_ut} style={{ display:'block', marginLeft:'auto', marginBottom:'1rem', background:'none', border:'none', cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontSize:'.8rem', color:'#aaa', textDecoration:'underline' }}>
          Logga ut från admin
        </button>

        {/* Tips lock */}
        <div className="adm-card">
          <p className="adm-card-title">🔒 Tips & Tilläggsfrågor</p>
          <div className="adm-lock-row">
            <p className="adm-lock-status">
              Status:{' '}
              <strong style={{ color: settings?.tips_låst === 'true' ? '#C8102E' : '#2a7a2a' }}>
                {settings?.tips_låst === 'true' ? '🔒 Låst' : '🔓 Öppet'}
              </strong>
              <span style={{ color:'#aaa', marginLeft:8, fontSize:'.8rem' }}>
                {settings?.tips_låst === 'true' ? '— deltagare kan inte längre ändra tips' : '— deltagare kan lämna och ändra tips'}
              </span>
            </p>
            <button onClick={toggleLås} className={`adm-btn ${settings?.tips_låst === 'true' ? 'success' : 'danger'}`}>
              {settings?.tips_låst === 'true' ? 'Lås upp' : 'Lås tips'}
            </button>
          </div>
        </div>

        {/* Summering */}
        <div className="adm-summary">
          <div className="adm-summary-item"><div className="adm-summary-val" style={{ color:'#C8102E' }}>{totalEjBetalt}</div><div className="adm-summary-lbl">Ej betalda</div></div>
          <div className="adm-summary-item"><div className="adm-summary-val">{totalBetalt}</div><div className="adm-summary-lbl">Betalda</div></div>
          <div className="adm-summary-item"><div className="adm-summary-val">{totalÅterbetald}</div><div className="adm-summary-lbl">Återbetalda</div></div>
          <div className="adm-summary-item"><div className="adm-summary-val" style={{ color:'#C8102E' }}>{pottVärde > 0 ? `${pottVärde} kr` : '—'}</div><div className="adm-summary-lbl">Pottvärde</div></div>
        </div>

        {/* Betalningar */}
        <AdminVinReminder
          adminSecret={adminSecret}
          visaToast={visaToast}
        />
        <div className="adm-card">
          <p className="adm-card-title">🍷 Betalningar</p>
          {viner.length === 0 ? (
            <p style={{ color:'#ccc', fontSize:'.88rem' }}>Inga viner registrerade ännu.</p>
          ) : (
            <div style={{ overflowX:'auto' }}>
              {/* En enda tabell — grupprader är <tr> med colspan */}
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Deltagare</th>
                    <th>Vin</th>
                    <th>Pris</th>
                    <th>Status</th>
                    <th>Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  <VinTabell rader={ejBetalt}      grupp="ej" {...tabellProps} />
                  <VinTabell rader={betaltOchÅter} grupp="ok" {...tabellProps} />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tipsstatus */}
      <AdminBetStatus adminSecret={adminSecret} visaToast={visaToast} />

      {toast && <div className="adm-toast">{toast}</div>}
    </>
  )
}
