/**
 * Admin.jsx — Refaktorerad
 *
 * Tidigare: ~350 rader med state, logik och JSX blandat.
 * Nu:       Ren presentationskomponent — all logik i useAdmin-hooken.
 *
 * Säkerhetsförbättringar (hanteras i useAdmin.js):
 *   - admin_secret lagras i sessionStorage (rensas vid flikstängning)
 *   - Automatisk utloggning vid 401-svar från backend
 *   - Migration av eventuell gammal localStorage-post
 */

import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'

// ── Stilar (oförändrade från original) ───────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .adm-wrap { max-width:900px; margin:0 auto; padding:2rem 1rem 5rem; }
  .adm-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .adm-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  .adm-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .adm-card-title { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0a1628; margin-bottom:1rem; }

  .adm-login-page { min-height:calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding:2rem 1rem; }
  .adm-login-card { background:#fff; border-radius:16px; padding:2.5rem 2rem; width:100%; max-width:360px; box-shadow:0 8px 32px rgba(0,0,0,.1); border:1px solid rgba(0,0,0,.07); }
  .adm-login-icon { font-size:2rem; margin-bottom:1rem; text-align:center; }
  .adm-login-title { font-family:'Barlow Condensed',sans-serif; font-size:1.5rem; font-weight:700; color:#0a1628; text-align:center; margin-bottom:1.5rem; }
  .adm-login-err { background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#8a1020; margin-bottom:1rem; }
  .adm-login-input { width:100%; padding:11px 14px; font-family:'Barlow',sans-serif; font-size:.95rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; outline:none; box-sizing:border-box; margin-bottom:.75rem; }
  .adm-login-input:focus { border-color:#C5A028; }
  .adm-login-btn { width:100%; padding:12px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; border:none; border-radius:8px; cursor:pointer; }
  .adm-login-btn:hover { opacity:.88; }
  .adm-login-btn:disabled { opacity:.5; cursor:not-allowed; }

  .adm-lock-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .adm-lock-status { font-family:'Barlow',sans-serif; font-size:.9rem; color:#555; margin:0; }

  .adm-btn { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:9px 20px; border:none; border-radius:8px; cursor:pointer; transition:opacity .15s; }
  .adm-btn.danger  { background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; }
  .adm-btn.success { background:linear-gradient(135deg,#1a6b35,#2a9a50); color:#fff; }
  .adm-btn.primary { background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; }
  .adm-btn.secondary { background:#f5f3ef; color:#0a1628; border:1px solid rgba(0,0,0,.1); }
  .adm-btn:hover { opacity:.85; }
  .adm-btn:disabled { opacity:.35; cursor:not-allowed; }

  .adm-summary { display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
  .adm-summary-item { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:10px; padding:.875rem 1rem; flex:1; min-width:90px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .adm-summary-val { font-family:'Barlow Condensed',sans-serif; font-size:1.5rem; font-weight:700; color:#0a1628; line-height:1; }
  .adm-summary-lbl { font-size:.63rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#aaa; margin-top:3px; display:block; }

  .adm-group-header { display:flex; align-items:center; gap:10px; margin:1.25rem 0 .75rem; }
  .adm-group-header:first-of-type { margin-top:0; }
  .adm-group-pill { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding:3px 12px; border-radius:100px; }
  .adm-group-pill.ej  { background:rgba(197,160,40,.12); color:#7a5c10; border:1px solid rgba(197,160,40,.3); }
  .adm-group-pill.ok  { background:rgba(10,22,40,.07); color:#0a1628; border:1px solid rgba(10,22,40,.15); }
  .adm-group-line { flex:1; height:1px; background:rgba(0,0,0,.07); }
  .adm-group-count { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; color:#aaa; }

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

  .adm-status-badge { display:inline-flex; align-items:center; gap:5px; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:3px 10px; border-radius:100px; }
  .adm-status-badge.betalt     { background:rgba(10,22,40,.08);   color:#0a1628; border:1px solid rgba(10,22,40,.15); }
  .adm-status-badge.ej_betalt  { background:rgba(197,160,40,.1);  color:#7a5c10; border:1px solid rgba(197,160,40,.25); }
  .adm-status-badge.återbetald { background:rgba(200,16,46,.07);  color:#8a1020; border:1px solid rgba(200,16,46,.2); }

  .adm-status-select { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:600; letter-spacing:.06em; padding:5px 10px; border:1.5px solid rgba(0,0,0,.12); border-radius:7px; background:#fff; color:#0a1628; outline:none; cursor:pointer; }

  .adm-action-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

  .adm-toast { position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%); background:#0a1628; color:#F0D060; font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:600; letter-spacing:.08em; padding:.75rem 1.5rem; border-radius:100px; box-shadow:0 4px 20px rgba(0,0,0,.3); z-index:999; white-space:nowrap; }

  .adm-logout-btn { font-family:'Barlow',sans-serif; font-size:.8rem; color:#aaa; background:none; border:none; cursor:pointer; text-decoration:underline; margin-left:auto; display:block; margin-bottom:1rem; }
  .adm-logout-btn:hover { color:#C8102E; }
`

// ── Betalningstabell (delkomponent) ───────────────────────────
function BetalningsTabell({ viner, pendingStatus, setPendingStatus, sparar, sänderMail, sparaStatus, skickaKvitto }) {
  if (viner.length === 0) {
    return <p style={{ color:'#aaa', fontSize:'.88rem', fontStyle:'italic' }}>Inga deltagare ännu.</p>
  }

  const ejBetalt  = viner.filter((v) => v.betalt !== 'betalt' && v.betalt !== 'återbetald')
  const betalt    = viner.filter((v) => v.betalt === 'betalt')
  const återbet   = viner.filter((v) => v.betalt === 'återbetald')

  const renderGrupp = (lista, rubrik, pillKlass) => lista.length > 0 && (
    <>
      <div className="adm-group-header">
        <span className={`adm-group-pill ${pillKlass}`}>{rubrik}</span>
        <div className="adm-group-line" />
        <span className="adm-group-count">{lista.length} st</span>
      </div>
      {lista.map((v) => renderRad(v))}
    </>
  )

  const renderRad = (v) => (
    <tr key={v.user_id}>
      <td><span className="adm-navn">{v.namn}</span></td>
      <td>
        {v.vin_url
          ? <a href={v.vin_url} target="_blank" rel="noopener noreferrer" className="adm-vin-link">{v.vin_namn || 'Länk'}</a>
          : <span className="adm-vin-none">{v.vin_namn || '—'}</span>}
      </td>
      <td><span className="adm-pris">{v.vin_pris ? `${v.vin_pris} kr` : '—'}</span></td>
      <td>
        {pendingStatus[v.user_id] ? (
          <div className="adm-action-row">
            <select
              className="adm-status-select"
              value={pendingStatus[v.user_id]}
              onChange={(e) => setPendingStatus((p) => ({ ...p, [v.user_id]: e.target.value }))}
            >
              <option value="betalt">Betalt</option>
              <option value="ej_betalt">Ej betalt</option>
              <option value="återbetald">Återbetald</option>
            </select>
            <button className="adm-btn primary" style={{fontSize:'.72rem',padding:'6px 12px'}} onClick={() => sparaStatus(v.user_id)} disabled={sparar === v.user_id}>
              {sparar === v.user_id ? '...' : 'Spara'}
            </button>
            <button className="adm-btn secondary" style={{fontSize:'.72rem',padding:'6px 12px'}} onClick={() => setPendingStatus((p) => { const k={...p}; delete k[v.user_id]; return k })}>
              Avbryt
            </button>
          </div>
        ) : (
          <div className="adm-action-row">
            <span className={`adm-status-badge ${v.betalt || 'ej_betalt'}`}>
              {v.betalt === 'betalt' ? '✓ Betalt' : v.betalt === 'återbetald' ? '↩ Återbet.' : '— Ej betalt'}
            </span>
            <button className="adm-btn secondary" style={{fontSize:'.72rem',padding:'5px 10px'}} onClick={() => setPendingStatus((p) => ({ ...p, [v.user_id]: v.betalt || 'ej_betalt' }))}>
              Ändra
            </button>
            {v.betalt === 'betalt' && (
              <button className="adm-btn primary" style={{fontSize:'.72rem',padding:'5px 10px'}} onClick={() => skickaKvitto(v.user_id, v.betalt)} disabled={sänderMail === v.user_id}>
                {sänderMail === v.user_id ? '...' : '📧 Kvitto'}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )

  return (
    <div style={{ overflowX:'auto' }}>
      <table className="adm-table">
        <thead>
          <tr>
            <th>Namn</th><th>Vin</th><th>Pris</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {renderGrupp(ejBetalt, 'Ej betalda', 'ej')}
          {renderGrupp(betalt,   'Betalda',    'ok')}
          {renderGrupp(återbet,  'Återbetalda','ok')}
        </tbody>
      </table>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────
export default function Admin() {
  const {
    lösenord, setLösenord,
    inloggad,
    fel,
    settings,
    viner,
    pendingStatus, setPendingStatus,
    sparar,
    sänderMail,
    toast,
    laddar,
    logga_in,
    logga_ut,
    toggleLås,
    sparaStatus,
    skickaKvitto,
  } = useAdmin()

  const totalEjBetalt  = viner.filter((v) => v.betalt !== 'betalt' && v.betalt !== 'återbetald').length
  const totalBetalt    = viner.filter((v) => v.betalt === 'betalt').length
  const totalÅterbetald = viner.filter((v) => v.betalt === 'återbetald').length
  const pottVärde      = viner.filter((v) => v.betalt === 'betalt').reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)

  // ── Inloggningsskärm ──────────────────────────────────────
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
              <input
                type="password"
                value={lösenord}
                onChange={(e) => setLösenord(e.target.value)}
                placeholder="Lösenord"
                required
                className="adm-login-input"
                autoFocus
              />
              <button type="submit" className="adm-login-btn" disabled={laddar}>
                {laddar ? 'Kontrollerar...' : 'Logga in'}
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  // ── Adminpanel ────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="adm-wrap">
        <p className="adm-eyebrow">VM-tipsen 2026</p>
        <h1 className="adm-title">Adminpanel</h1>

        {/* Utloggningsknapp */}
        <button className="adm-logout-btn" onClick={logga_ut}>
          Logga ut från admin
        </button>

        {/* Tips lock */}
        <div className="adm-card">
          <p className="adm-card-title">🔒 Tips &amp; Tilläggsfrågor</p>
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

        {/* Summering */}
        <div className="adm-summary">
          <div className="adm-summary-item">
            <div className="adm-summary-val" style={{ color:'#C8102E' }}>{totalEjBetalt}</div>
            <div className="adm-summary-lbl">Ej betalda</div>
          </div>
          <div className="adm-summary-item">
            <div className="adm-summary-val">{totalBetalt}</div>
            <div className="adm-summary-lbl">Betalda</div>
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

        {/* Betalningar */}
        <div className="adm-card">
          <p className="adm-card-title">🍷 Betalningar</p>
          <BetalningsTabell
            viner={viner}
            pendingStatus={pendingStatus}
            setPendingStatus={setPendingStatus}
            sparar={sparar}
            sänderMail={sänderMail}
            sparaStatus={sparaStatus}
            skickaKvitto={skickaKvitto}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="adm-toast">{toast}</div>}
    </>
  )
}
