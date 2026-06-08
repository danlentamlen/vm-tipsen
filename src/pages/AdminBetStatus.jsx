/**
 * src/pages/AdminBetStatus.jsx
 *
 * Standalone admin page at /admin/tipsstatus
 * Shows per-participant bet completion and lets admin send reminders.
 *
 * Has its own password gate — same pattern as Admin.jsx.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

const KNOCKOUT_ROUNDS = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

const ROUND_LABELS_SV = {
  'Round of 32':           'Omg. 32',
  'Round of 16':           'Åttondel',
  'Quarter-final':         'Kvart',
  'Semi-final':            'Semi',
  'Match for third place': 'Brons',
  'Final':                 'Final',
}

const ROUND_DEADLINES = {
  'Round of 32':           '29 jun ~20:00',
  'Round of 16':           '7 jul ~20:00',
  'Quarter-final':         '11 jul ~20:00',
  'Semi-final':            '14 jul ~20:00',
  'Match for third place': '18 jul ~19:00',
  'Final':                 '19 jul ~17:00',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap');

  .abs-wrap { max-width:1000px; margin:0 auto; padding:2rem 1rem 5rem; }
  .abs-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .abs-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.6rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }
  .abs-back { display:inline-flex; align-items:center; gap:6px; font-family:'Barlow',sans-serif; font-size:.8rem; color:#aaa; text-decoration:none; margin-bottom:1.5rem; transition:color .15s; }
  .abs-back:hover { color:#555; }

  /* Login */
  .abs-login-page { min-height:calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding:2rem 1rem; }
  .abs-login-card { background:#fff; border-radius:16px; padding:2.5rem 2rem; width:100%; max-width:360px; box-shadow:0 8px 32px rgba(0,0,0,.1); border:1px solid rgba(0,0,0,.07); }
  .abs-login-icon { font-size:2rem; margin-bottom:1rem; text-align:center; }
  .abs-login-title { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:700; color:#0a1628; text-align:center; margin-bottom:1.5rem; }
  .abs-login-err { background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#8a1020; margin-bottom:1rem; }
  .abs-login-input { width:100%; padding:11px 14px; font-family:'Barlow',sans-serif; font-size:.95rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; outline:none; box-sizing:border-box; margin-bottom:.75rem; }
  .abs-login-input:focus { border-color:#C5A028; }
  .abs-login-btn { width:100%; padding:12px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; border:none; border-radius:8px; cursor:pointer; }
  .abs-login-btn:hover { opacity:.88; }

  /* Card */
  .abs-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .abs-card-title { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0a1628; margin-bottom:1rem; }

  /* Top controls */
  .abs-top { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; margin-bottom:1.5rem; }
  .abs-refresh-btn { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:8px 18px; border:none; border-radius:8px; cursor:pointer; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; transition:opacity .15s; }
  .abs-refresh-btn:hover { opacity:.85; }
  .abs-refresh-btn:disabled { opacity:.4; cursor:not-allowed; }
  .abs-logout-btn { margin-left:auto; font-family:'Barlow',sans-serif; font-size:.78rem; color:#bbb; background:none; border:none; cursor:pointer; text-decoration:underline; }

  /* Summary chips */
  .abs-chips { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1.25rem; }
  .abs-chip { background:#f8f7f4; border:1px solid rgba(0,0,0,.07); border-radius:20px; padding:4px 12px; font-family:'Barlow',sans-serif; font-size:.75rem; color:#555; }
  .abs-chip strong { color:#0a1628; }

  /* Remind row */
  .abs-remind-row { display:flex; align-items:center; flex-wrap:wrap; gap:.625rem; padding:.875rem 1rem; background:#f8f7f4; border-radius:10px; margin-bottom:1.25rem; }
  .abs-remind-label { font-family:'Barlow',sans-serif; font-size:.85rem; color:#555; flex:1; min-width:160px; }
  .abs-remind-btn { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:7px 14px; border:none; border-radius:7px; cursor:pointer; transition:opacity .15s; white-space:nowrap; }
  .abs-remind-btn.primary { background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; }
  .abs-remind-btn.outline { background:#fff; border:1.5px solid #ddd; color:#555; }
  .abs-remind-btn:hover { opacity:.85; }
  .abs-remind-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* Knockout cards */
  .abs-ko-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:.75rem; margin-bottom:1.5rem; }
  .abs-ko-card { background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:10px; padding:1rem 1.125rem; }
  .abs-ko-header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:.375rem; }
  .abs-ko-name { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#0a1628; }
  .abs-ko-deadline { font-family:'Barlow',sans-serif; font-size:.68rem; color:#bbb; }
  .abs-ko-avg { font-family:'Barlow Condensed',sans-serif; font-size:1.75rem; font-weight:700; line-height:1; margin-bottom:.2rem; }
  .abs-ko-sub { font-family:'Barlow',sans-serif; font-size:.7rem; color:#bbb; margin-bottom:.625rem; }
  .abs-ko-remind { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:5px 10px; border:none; border-radius:6px; cursor:pointer; background:linear-gradient(135deg,#1a2e4a,#0a1628); color:#F0D060; transition:opacity .15s; }
  .abs-ko-remind:hover { opacity:.85; }
  .abs-ko-remind:disabled { opacity:.35; cursor:not-allowed; }
  .abs-ko-na { font-family:'Barlow',sans-serif; font-size:.75rem; color:#ccc; margin:0; }

  /* Selection */
  .abs-sel { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-bottom:.75rem; }
  .abs-sel-btn { font-family:'Barlow',sans-serif; font-size:.75rem; color:#888; background:none; border:none; cursor:pointer; padding:3px 8px; border-radius:5px; transition:background .15s; }
  .abs-sel-btn:hover { background:#f0ede6; color:#444; }
  .abs-sel-count { font-family:'Barlow',sans-serif; font-size:.75rem; color:#aaa; margin-left:auto; }

  /* Table */
  .abs-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .abs-table { width:100%; border-collapse:collapse; font-family:'Barlow',sans-serif; font-size:.82rem; }
  .abs-table th { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#aaa; padding:.5rem .625rem; text-align:left; border-bottom:1px solid rgba(0,0,0,.07); white-space:nowrap; }
  .abs-table td { padding:.55rem .625rem; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:middle; white-space:nowrap; }
  .abs-table tr:last-child td { border-bottom:none; }
  .abs-table tr.abs-row { cursor:pointer; }
  .abs-table tr.abs-row:hover td { background:rgba(0,0,0,.015); }
  .abs-table tr.abs-row.selected td { background:rgba(197,160,40,.07); }
  .abs-name { font-weight:600; color:#0a1628; }

  /* Pct bar */
  .abs-pct { display:inline-flex; align-items:center; gap:5px; }
  .abs-bar { width:44px; height:5px; background:rgba(0,0,0,.07); border-radius:3px; overflow:hidden; flex-shrink:0; }
  .abs-fill { height:100%; border-radius:3px; transition:width .3s; }
  .abs-fill.green { background:#1a7a35; }
  .abs-fill.yellow { background:#C5A028; }
  .abs-fill.red { background:#C8102E; }
  .abs-pct-num { font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:700; min-width:32px; }
  .abs-pct-num.green { color:#1a7a35; }
  .abs-pct-num.yellow { color:#C5A028; }
  .abs-pct-num.red { color:#C8102E; }

  /* Dot */
  .abs-dot { width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0; }
  .abs-dot.green { background:#1a7a35; }
  .abs-dot.yellow { background:#C5A028; }
  .abs-dot.red { background:#C8102E; }
  .abs-dot.grey { background:#ddd; }

  /* Legend */
  .abs-legend { display:flex; gap:1rem; flex-wrap:wrap; margin-top:.75rem; font-family:'Barlow',sans-serif; font-size:.7rem; color:#aaa; }
  .abs-legend-hint { margin-left:auto; }

  /* Toast */
  .abs-toast { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:#0a1628; color:#F0D060; font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; letter-spacing:.08em; padding:.875rem 1.75rem; border-radius:100px; box-shadow:0 8px 24px rgba(0,0,0,.25); z-index:999; white-space:nowrap; }

  @media (max-width:600px) {
    .abs-ko-grid { grid-template-columns:1fr 1fr; }
    .abs-table th, .abs-table td { padding:.4rem .45rem; font-size:.75rem; }
    .abs-bar { width:28px; }
  }
`

function pctColor(pct) {
  if (pct === null || pct === undefined) return 'grey'
  if (pct >= 80) return 'green'
  if (pct >= 40) return 'yellow'
  return 'red'
}

function PctCell({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color:'#ccc', fontSize:'.75rem' }}>—</span>
  const col = pctColor(pct)
  return (
    <span className="abs-pct">
      <span className="abs-bar"><span className={`abs-fill ${col}`} style={{ width:`${pct}%` }} /></span>
      <span className={`abs-pct-num ${col}`}>{pct}%</span>
    </span>
  )
}

function DotCell({ pct }) {
  if (pct === null || pct === undefined) return <span className="abs-dot grey" title="Inga matcher" />
  return <span className={`abs-dot ${pctColor(pct)}`} title={`${pct}%`} />
}

export default function AdminBetStatus() {
  const [lösenord, setLösenord]       = useState('')
  const [inloggad, setInloggad]       = useState(() => !!sessionStorage.getItem('admin_secret'))
  const [adminSecret, setAdminSecret] = useState(() => sessionStorage.getItem('admin_secret') || '')
  const [loginFel, setLoginFel]       = useState(null)
  const [data, setData]               = useState(null)
  const [laddar, setLaddar]           = useState(false)
  const [harLaddat, setHarLaddat]     = useState(false)
  const [selected, setSelected]       = useState(new Set())
  const [sending, setSending]         = useState(null)
  const [toast, setToast]             = useState(null)

  function visaToast(text, ms = 3500) {
    setToast(text)
    setTimeout(() => setToast(null), ms)
  }

  async function logga_in(e) {
    e.preventDefault()
    setLoginFel(null)
    const res = await fetch('/.netlify/functions/admin', {
      headers: { Authorization: `Bearer ${lösenord}` },
    }).catch(() => null)
    if (res?.ok) {
      sessionStorage.setItem('admin_secret', lösenord)
      setAdminSecret(lösenord)
      setInloggad(true)
      setLösenord('')
    } else {
      setLoginFel('Fel lösenord')
    }
  }

  function logga_ut() {
    sessionStorage.removeItem('admin_secret')
    setInloggad(false)
    setAdminSecret('')
    setData(null)
    setHarLaddat(false)
  }

  const hämta = useCallback(async () => {
    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/admin-bet-status', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      })
      if (res.status === 401) { logga_ut(); return }
      if (!res.ok) throw new Error('Serverfel')
      const d = await res.json()
      setData(d)
      setHarLaddat(true)
      setSelected(new Set())
    } catch {
      visaToast('❌ Kunde inte hämta tipsstatus')
    } finally {
      setLaddar(false)
    }
  }, [adminSecret])

  useEffect(() => {
    if (inloggad && adminSecret && !harLaddat) hämta()
  }, [inloggad, adminSecret, harLaddat, hämta])

  function toggleSelect(uid) {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(uid) ? n.delete(uid) : n.add(uid)
      return n
    })
  }

  function selectAll() {
    if (!data) return
    setSelected(new Set(data.stats.map((s) => s.user_id)))
  }

  function selectIncomplete() {
    if (!data) return
    setSelected(new Set(
      data.stats.filter((s) => s.groupBetPct < 100 || s.questionPct < 100).map((s) => s.user_id)
    ))
  }

  function selectNone() { setSelected(new Set()) }

  async function sendReminder(type, round) {
    if (selected.size === 0) { visaToast('Välj minst en deltagare'); return }
    const key = type === 'group' ? 'group' : `knockout:${round}`
    setSending(key)
    try {
      const res = await fetch('/.netlify/functions/admin-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_ids: [...selected], type, ...(round ? { round } : {}) }),
      })
      const d = await res.json()
      visaToast(res.ok ? `📧 ${d.message}` : `❌ ${d.error || 'Fel'}`)
    } catch {
      visaToast('❌ Kunde inte skicka påminnelse')
    } finally {
      setSending(null)
    }
  }

  function avgKnockout(round) {
    if (!data) return null
    const vals = data.stats
      .map((s) => s.knockoutRounds[round])
      .filter((v) => v !== null && v !== undefined)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  /* ── Login screen ───────────────────────────────────── */
  if (!inloggad) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="abs-login-page">
          <div className="abs-login-card">
            <div className="abs-login-icon">📊</div>
            <h1 className="abs-login-title">Tipsstatus</h1>
            <form onSubmit={logga_in}>
              {loginFel && <div className="abs-login-err">{loginFel}</div>}
              <input
                type="password"
                value={lösenord}
                onChange={(e) => setLösenord(e.target.value)}
                placeholder="Adminlösenord"
                required
                className="abs-login-input"
              />
              <button type="submit" className="abs-login-btn">Logga in</button>
            </form>
          </div>
        </div>
      </>
    )
  }

  const colorMap = { green: '#1a7a35', yellow: '#C5A028', red: '#C8102E', grey: '#ccc' }

  /* ── Main page ──────────────────────────────────────── */
  return (
    <>
      <style>{STYLES}</style>
      <div className="abs-wrap">
        <Link to="/admin" className="abs-back">← Tillbaka till adminpanel</Link>

        <p className="abs-eyebrow">VM-tipsen 2026</p>
        <h1 className="abs-title">📊 Tipsstatus</h1>

        <div className="abs-top">
          <button className="abs-refresh-btn" onClick={hämta} disabled={laddar}>
            {laddar ? '⏳ Laddar...' : (harLaddat ? '↻ Uppdatera' : '▶ Hämta status')}
          </button>
          <button className="abs-logout-btn" onClick={logga_ut}>Logga ut</button>
        </div>

        {laddar && (
          <div className="abs-card">
            <p style={{ color:'#bbb', fontFamily:"'Barlow',sans-serif", fontSize:'.88rem', margin:0 }}>Hämtar data…</p>
          </div>
        )}

        {harLaddat && data && (
          <>
            {/* Summary chips */}
            <div className="abs-chips">
              <span className="abs-chip"><strong>{data.summary.totalUsers}</strong> deltagare</span>
              <span className="abs-chip"><strong>{data.summary.totalGroupMatches}</strong> gruppspelsmatcher</span>
              <span className="abs-chip"><strong>{data.summary.totalQuestions}</strong> tilläggsfrågor</span>
            </div>

            {/* ── Group stage + questions ─────────────── */}
            <div className="abs-card">
              <p className="abs-card-title">⚽ Gruppspel & Tilläggsfrågor</p>

              <div className="abs-remind-row">
                <span className="abs-remind-label">
                  Deadline: <strong>11 jun kl 16:00 CEST</strong>
                </span>
                <button className="abs-remind-btn outline" onClick={selectIncomplete}>
                  Välj ofärdiga
                </button>
                <button
                  className="abs-remind-btn primary"
                  disabled={selected.size === 0 || sending === 'group'}
                  onClick={() => sendReminder('group')}
                >
                  {sending === 'group'
                    ? '📧 Skickar…'
                    : `📧 Skicka påminnelse${selected.size > 0 ? ` (${selected.size})` : ''}`}
                </button>
              </div>

              <div className="abs-sel">
                <button className="abs-sel-btn" onClick={selectAll}>Välj alla</button>
                <button className="abs-sel-btn" onClick={selectIncomplete}>Välj ofärdiga</button>
                <button className="abs-sel-btn" onClick={selectNone}>Rensa</button>
                {selected.size > 0 && <span className="abs-sel-count">{selected.size} markerade</span>}
              </div>

              <div className="abs-table-wrap">
                <table className="abs-table">
                  <thead>
                    <tr>
                      <th style={{ width:24 }}></th>
                      <th>Deltagare</th>
                      <th>Gruppspel</th>
                      <th>Tilläggsfrågor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stats
                      .slice()
                      .sort((a, b) => a.namn.localeCompare(b.namn, 'sv'))
                      .map((s) => (
                        <tr
                          key={s.user_id}
                          className={`abs-row${selected.has(s.user_id) ? ' selected' : ''}`}
                          onClick={() => toggleSelect(s.user_id)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(s.user_id)}
                              onChange={() => toggleSelect(s.user_id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor:'pointer' }}
                            />
                          </td>
                          <td><span className="abs-name">{s.namn}</span></td>
                          <td><PctCell pct={s.groupBetPct} /></td>
                          <td><PctCell pct={s.questionPct} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="abs-legend">
                <span><span style={{ color:'#1a7a35' }}>●</span> ≥ 80%</span>
                <span><span style={{ color:'#C5A028' }}>●</span> 40–79%</span>
                <span><span style={{ color:'#C8102E' }}>●</span> &lt; 40%</span>
                <span className="abs-legend-hint">Klicka på en rad för att markera/avmarkera</span>
              </div>
            </div>

            {/* ── Knockout rounds ─────────────────────── */}
            <div className="abs-card">
              <p className="abs-card-title">🏆 Slutspelsomgångar</p>

              <div className="abs-ko-grid">
                {KNOCKOUT_ROUNDS.map((rond) => {
                  const matchCount = data.summary.knockoutMatchCounts[rond] || 0
                  const avg = avgKnockout(rond)
                  const sendKey = `knockout:${rond}`
                  return (
                    <div className="abs-ko-card" key={rond}>
                      <div className="abs-ko-header">
                        <span className="abs-ko-name">{ROUND_LABELS_SV[rond]}</span>
                        <span className="abs-ko-deadline">{ROUND_DEADLINES[rond]}</span>
                      </div>
                      {matchCount === 0 ? (
                        <p className="abs-ko-na">Inga matcher schemalagda</p>
                      ) : (
                        <>
                          <div className="abs-ko-avg" style={{ color: colorMap[pctColor(avg)] }}>
                            {avg !== null ? `${avg}%` : '—'}
                          </div>
                          <div className="abs-ko-sub">snitt tippat · {matchCount} matcher</div>
                          <button
                            className="abs-ko-remind"
                            disabled={selected.size === 0 || sending === sendKey}
                            onClick={() => sendReminder('knockout', rond)}
                          >
                            {sending === sendKey
                              ? '📧 Skickar…'
                              : `📧 Påminn${selected.size > 0 ? ` (${selected.size})` : ''}`}
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="abs-sel">
                <button className="abs-sel-btn" onClick={selectAll}>Välj alla</button>
                <button className="abs-sel-btn" onClick={selectNone}>Rensa</button>
                {selected.size > 0 && <span className="abs-sel-count">{selected.size} markerade</span>}
              </div>

              <div className="abs-table-wrap">
                <table className="abs-table">
                  <thead>
                    <tr>
                      <th style={{ width:24 }}></th>
                      <th>Deltagare</th>
                      {KNOCKOUT_ROUNDS.map((r) => (
                        <th key={r} title={r}>{ROUND_LABELS_SV[r]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.stats
                      .slice()
                      .sort((a, b) => a.namn.localeCompare(b.namn, 'sv'))
                      .map((s) => (
                        <tr
                          key={s.user_id}
                          className={`abs-row${selected.has(s.user_id) ? ' selected' : ''}`}
                          onClick={() => toggleSelect(s.user_id)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(s.user_id)}
                              onChange={() => toggleSelect(s.user_id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor:'pointer' }}
                            />
                          </td>
                          <td><span className="abs-name">{s.namn}</span></td>
                          {KNOCKOUT_ROUNDS.map((r) => (
                            <td key={r} style={{ textAlign:'center' }}>
                              <DotCell pct={s.knockoutRounds[r]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="abs-legend">
                <span><span style={{ color:'#1a7a35' }}>●</span> ≥ 80%</span>
                <span><span style={{ color:'#C5A028' }}>●</span> 40–79%</span>
                <span><span style={{ color:'#C8102E' }}>●</span> &lt; 40%</span>
                <span><span style={{ color:'#ddd' }}>●</span> Inga matcher</span>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && <div className="abs-toast">{toast}</div>}
    </>
  )
}
