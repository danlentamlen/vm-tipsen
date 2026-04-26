import { useState, useEffect } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .adm-wrap { max-width:900px; margin:0 auto; padding:2rem 1rem 4rem; }
  .adm-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .adm-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.5rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  /* Login */
  .adm-login-page { min-height:calc(100svh - 60px); display:flex; align-items:center; justify-content:center; padding:2rem 1rem; background:linear-gradient(160deg,#0a1628,#0d2040); }
  .adm-login-card { width:100%; max-width:360px; background:#fff; border-radius:14px; padding:2rem 1.75rem; box-shadow:0 20px 60px rgba(0,0,0,.4); }
  .adm-login-icon { text-align:center; font-size:2rem; margin-bottom:1rem; }
  .adm-login-title { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:700; color:#0a1628; letter-spacing:.04em; text-transform:uppercase; margin-bottom:1.25rem; text-align:center; }
  .adm-login-input { width:100%; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:.9rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; outline:none; box-sizing:border-box; transition:border-color .15s; }
  .adm-login-input:focus { border-color:#C5A028; }
  .adm-login-btn { width:100%; padding:12px; margin-top:.75rem; font-family:'Barlow Condensed',sans-serif; font-size:.95rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; border:none; border-radius:8px; cursor:pointer; transition:opacity .2s; }
  .adm-login-btn:hover { opacity:.88; }
  .adm-login-err { background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); color:#8a1020; border-radius:8px; padding:.75rem 1rem; font-size:.85rem; margin-bottom:1rem; }

  /* Toast */
  .adm-toast { position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%); background:#0a1628; color:#F0D060; font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:600; letter-spacing:.06em; padding:.75rem 1.5rem; border-radius:100px; box-shadow:0 8px 24px rgba(0,0,0,.3); z-index:999; white-space:nowrap; animation:toast-in .3s ease; }
  @keyframes toast-in { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

  /* Section cards */
  .adm-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem; margin-bottom:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .adm-card-title { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:#0a1628; margin-bottom:1.25rem; display:flex; align-items:center; gap:8px; }

  /* Tips lock */
  .adm-lock-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .adm-lock-status { font-family:'Barlow',sans-serif; font-size:.9rem; color:#555; }
  .adm-lock-status strong { color:#0a1628; }
  .adm-btn { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:9px 20px; border-radius:8px; border:none; cursor:pointer; transition:opacity .2s; }
  .adm-btn.danger { background:rgba(200,16,46,.1); color:#C8102E; border:1px solid rgba(200,16,46,.2); }
  .adm-btn.success { background:rgba(10,22,40,.07); color:#0a1628; border:1px solid rgba(10,22,40,.15); }
  .adm-btn.primary { background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; }
  .adm-btn:hover { opacity:.85; }
  .adm-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* Payments table */
  .adm-table { width:100%; border-collapse:collapse; }
  .adm-table th { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:#aaa; text-align:left; padding:.5rem .75rem; border-bottom:1px solid rgba(0,0,0,.07); }
  .adm-table td { padding:.75rem; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:middle; }
  .adm-table tr:last-child td { border-bottom:none; }
  .adm-table tr:hover td { background:#fafaf8; }

  .adm-navn { font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .adm-vin-link { font-family:'Barlow',sans-serif; font-size:.82rem; color:#C5A028; text-decoration:none; }
  .adm-vin-link:hover { text-decoration:underline; }
  .adm-vin-none { font-size:.82rem; color:#ccc; font-style:italic; }
  .adm-pris { font-family:'Barlow Condensed',sans-serif; font-size:.9rem; color:#555; }

  /* Status badge */
  .adm-status-badge { display:inline-flex; align-items:center; gap:5px; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:3px 10px; border-radius:100px; }
  .adm-status-badge.betalt    { background:rgba(10,22,40,.08);   color:#0a1628;  border:1px solid rgba(10,22,40,.15); }
  .adm-status-badge.ej_betalt { background:rgba(197,160,40,.1); color:#7a5c10; border:1px solid rgba(197,160,40,.25); }
  .adm-status-badge.återbetald { background:rgba(200,16,46,.07); color:#8a1020; border:1px solid rgba(200,16,46,.2); }

  /* Status select */
  .adm-status-select { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:600; letter-spacing:.06em; padding:5px 10px; border:1.5px solid rgba(0,0,0,.12); border-radius:7px; background:#fff; color:#0a1628; outline:none; cursor:pointer; transition:border-color .15s; }
  .adm-status-select:focus { border-color:#C5A028; }

  /* Action buttons */
  .adm-actions { display:flex; gap:6px; flex-wrap:wrap; }
  .adm-action-btn { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:5px 10px; border-radius:6px; border:none; cursor:pointer; white-space:nowrap; transition:all .15s; }
  .adm-action-btn.save  { background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; }
  .adm-action-btn.mail  { background:rgba(197,160,40,.1); color:#7a5c10; border:1px solid rgba(197,160,40,.3); }
  .adm-action-btn:hover:not(:disabled) { opacity:.85; }
  .adm-action-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* Summary row */
  .adm-summary { display:flex; gap:1.25rem; margin-bottom:1.25rem; flex-wrap:wrap; }
  .adm-summary-item { background:#f8f7f4; border-radius:8px; padding:.75rem 1rem; flex:1; min-width:100px; }
  .adm-summary-val { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:700; color:#0a1628; line-height:1; }
  .adm-summary-lbl { font-size:.65rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#aaa; margin-top:2px; }

  @media (max-width:640px) {
    .adm-table th:nth-child(3), .adm-table td:nth-child(3) { display:none; }
    .adm-actions { flex-direction:column; }
  }
`

const STATUS_LABELS = {
  betalt:     { label: 'Betalt',     emoji: '✅' },
  ej_betalt:  { label: 'Ej betalt',  emoji: '⏳' },
  återbetald: { label: 'Återbetald', emoji: '↩️' },
}

export default function Admin() {
  const [lösenord, setLösenord]     = useState('')
  const [inloggad, setInloggad]     = useState(() => !!localStorage.getItem('admin_secret'))
  const [fel, setFel]               = useState(null)
  const [settings, setSettings]     = useState(null)
  const [viner, setViner]           = useState([])
  const [pendingStatus, setPendingStatus] = useState({}) // user_id -> vald status
  const [sparar, setSparar]         = useState(null)
  const [sänderMail, setSänderMail] = useState(null)
  const [toast, setToast]           = useState(null)

  const adminSecret = localStorage.getItem('admin_secret')

  useEffect(() => {
    if (inloggad) {
      hämtaSettings()
      hämtaViner()
    }
  }, [inloggad])

  function visaToast(text, ms = 3000) {
    setToast(text)
    setTimeout(() => setToast(null), ms)
  }

  async function logga_in(e) {
    e.preventDefault()
    const res = await fetch('/.netlify/functions/admin', {
      headers: { Authorization: `Bearer ${lösenord}` },
    })
    if (res.ok) {
      localStorage.setItem('admin_secret', lösenord)
      setInloggad(true)
      setFel(null)
    } else {
      setFel('Fel lösenord')
    }
  }

  async function hämtaSettings() {
    const res = await fetch('/.netlify/functions/admin', {
      headers: { Authorization: `Bearer ${adminSecret}` },
    })
    const data = await res.json()
    setSettings(data)
  }

  async function hämtaViner() {
    const res = await fetch('/.netlify/functions/viner-hamta')
    const data = await res.json()
    setViner(Array.isArray(data) ? data : [])
  }

  async function toggleLås() {
    const nyttVärde = settings?.tips_låst === 'true' ? 'false' : 'true'
    await fetch('/.netlify/functions/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ nyckel: 'tips_låst', värde: nyttVärde }),
    })
    visaToast(nyttVärde === 'true' ? '🔒 Tips låsta!' : '🔓 Tips upplåsta!')
    hämtaSettings()
  }

  async function sparaStatus(user_id) {
    const status = pendingStatus[user_id]
    if (!status) return
    setSparar(user_id)
    try {
      // Vid återbetald — skicka kvitto INNAN raden raderas
      if (status === 'återbetald') {
        await fetch('/.netlify/functions/admin-kvitto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
          body: JSON.stringify({ user_id, status }),
        }).catch(() => {}) // ignorera mailfel — radera ändå
      }

      const res = await fetch('/.netlify/functions/admin-betalning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_id, status }),
      })
      if (res.ok) {
        if (status === 'återbetald') {
          // Ta bort från listan lokalt
          setViner((prev) => prev.filter((v) => v.user_id !== user_id))
          visaToast('↩️ Vin raderat och mail skickat')
        } else {
          setViner((prev) => prev.map((v) => v.user_id === user_id ? { ...v, betalt: status } : v))
          visaToast('✅ Status uppdaterad')
        }
        setPendingStatus((prev) => { const n = { ...prev }; delete n[user_id]; return n })
      } else {
        visaToast('❌ Något gick fel')
      }
    } catch { visaToast('❌ Något gick fel') }
    setSparar(null)
  }

  async function skickaKvitto(user_id) {
    const vin = viner.find((v) => v.user_id === user_id)
    if (!vin) return
    setSänderMail(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-kvitto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_id, status: vin.betalt }),
      })
      if (res.ok) {
        visaToast(`📧 Mail skickat till ${vin.namn}`)
      } else {
        const data = await res.json()
        visaToast(`❌ ${data.error || 'Kunde inte skicka mail'}`)
      }
    } catch { visaToast('❌ Kunde inte skicka mail') }
    setSänderMail(null)
  }

  // Stats
  const totalBetalt    = viner.filter((v) => v.betalt === 'betalt').length
  const totalEjBetalt  = viner.filter((v) => v.betalt === 'ej_betalt' && v.vin_namn).length
  const totalÅterbetald = viner.filter((v) => v.betalt === 'återbetald').length
  const pottVärde      = viner.filter((v) => v.betalt === 'betalt').reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)

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
              <input type="password" value={lösenord} onChange={(e) => setLösenord(e.target.value)}
                placeholder="Lösenord" required className="adm-login-input" />
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
                {settings?.tips_låst === 'true'
                  ? '— deltagare kan inte längre ändra tips'
                  : '— deltagare kan lämna och ändra tips'}
              </span>
            </p>
            <button
              onClick={toggleLås}
              className={`adm-btn ${settings?.tips_låst === 'true' ? 'success' : 'danger'}`}
            >
              {settings?.tips_låst === 'true' ? 'Lås upp' : 'Lås tips'}
            </button>
          </div>
        </div>

        {/* Payment summary */}
        <div className="adm-summary">
          <div className="adm-summary-item">
            <div className="adm-summary-val">{totalBetalt}</div>
            <div className="adm-summary-lbl">Betalda</div>
          </div>
          <div className="adm-summary-item">
            <div className="adm-summary-val">{totalEjBetalt}</div>
            <div className="adm-summary-lbl">Ej betalda</div>
          </div>
          <div className="adm-summary-item">
            <div className="adm-summary-val">{totalÅterbetald}</div>
            <div className="adm-summary-lbl">Återbetalda</div>
          </div>
          <div className="adm-summary-item">
            <div className="adm-summary-val" style={{ color:'#C8102E' }}>{pottVärde > 0 ? `${pottVärde} kr` : '—'}</div>
            <div className="adm-summary-lbl">Pottvärde</div>
          </div>
        </div>

        {/* Payments table */}
        <div className="adm-card">
          <p className="adm-card-title">🍷 Betalningar</p>

          {viner.length === 0 ? (
            <p style={{ color:'#ccc', fontSize:'.88rem' }}>Inga viner registrerade ännu.</p>
          ) : (
            <div style={{ overflowX:'auto' }}>
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
                  {viner.map((v) => {
                    const nuvarandeStatus = v.betalt || 'ej_betalt'
                    const valdStatus = pendingStatus[v.user_id] ?? nuvarandeStatus
                    const harÄndrat = pendingStatus[v.user_id] && pendingStatus[v.user_id] !== nuvarandeStatus

                    return (
                      <tr key={v.user_id}>
                        <td><span className="adm-navn">{v.namn}</span></td>
                        <td>
                          {v.vin_namn
                            ? <a href={v.vin_url} target="_blank" rel="noopener noreferrer" className="adm-vin-link">{v.vin_namn}</a>
                            : <span className="adm-vin-none">Ej valt</span>
                          }
                        </td>
                        <td>
                          <span className="adm-pris">{v.vin_pris ? `${v.vin_pris} kr` : '—'}</span>
                        </td>
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="adm-toast">{toast}</div>}
    </>
  )
}