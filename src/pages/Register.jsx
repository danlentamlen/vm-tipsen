import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap');

  .reg-wrap { max-width:460px; margin:0 auto; padding:2.5rem 1rem 5rem; }
  .reg-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .reg-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.5rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.5rem; }

  /* Stegindikator */
  .reg-steps { display:flex; align-items:center; gap:0; margin-bottom:1.75rem; }
  .reg-step { display:flex; align-items:center; gap:8px; }
  .reg-step-dot { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:.8rem; font-weight:700; border:2px solid rgba(0,0,0,.12); background:#fff; color:#aaa; flex-shrink:0; transition:all .2s; }
  .reg-step-dot.active { background:#0a1628; color:#F0D060; border-color:#0a1628; }
  .reg-step-dot.done { background:#1a6b35; color:#fff; border-color:#1a6b35; }
  .reg-step-label { font-family:'Barlow',sans-serif; font-size:.78rem; font-weight:500; color:#aaa; }
  .reg-step-label.active { color:#0a1628; font-weight:600; }
  .reg-step-line { flex:1; height:1px; background:rgba(0,0,0,.1); margin:0 10px; }

  .reg-cost-card { background:linear-gradient(135deg,#0a1628,#1a2e4a); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; }
  .reg-cost-title { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:rgba(255,255,255,.4); margin-bottom:.75rem; }
  .reg-cost-row { display:flex; justify-content:space-between; align-items:center; padding:.375rem 0; border-bottom:1px solid rgba(255,255,255,.07); }
  .reg-cost-label { font-family:'Barlow',sans-serif; font-size:.85rem; color:rgba(255,255,255,.65); }
  .reg-cost-value { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#fff; }
  .reg-cost-value.gold { color:#F0D060; }
  .reg-cost-total { display:flex; justify-content:space-between; align-items:center; padding:.75rem 0 .25rem; border-top:1px solid rgba(255,255,255,.15); margin-top:.25rem; }
  .reg-cost-total-label { font-family:'Barlow',sans-serif; font-size:.85rem; font-weight:600; color:rgba(255,255,255,.7); }
  .reg-cost-total-value { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; color:#F0D060; }
  .reg-cost-note { font-family:'Barlow',sans-serif; font-size:.73rem; color:rgba(255,255,255,.35); margin-top:.75rem; line-height:1.5; }

  .reg-form-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem; box-shadow:0 2px 12px rgba(0,0,0,.06); }
  .reg-field { margin-bottom:1rem; }
  .reg-label { display:block; font-family:'Barlow',sans-serif; font-size:.82rem; font-weight:600; color:#0a1628; margin-bottom:5px; }
  .reg-label-opt { font-weight:400; color:#aaa; font-size:.75rem; margin-left:4px; }
  .reg-input { width:100%; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:.9rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; background:#fff; color:#0a1628; outline:none; transition:border-color .15s; box-sizing:border-box; }
  .reg-input:focus { border-color:#C5A028; }
  .reg-select { width:100%; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:.9rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; background:#fff; color:#0a1628; outline:none; transition:border-color .15s; box-sizing:border-box; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:36px; }
  .reg-select:focus { border-color:#C5A028; }
  .reg-hint { font-family:'Barlow',sans-serif; font-size:.73rem; color:#aaa; margin-top:4px; line-height:1.4; }

  .reg-recruiter-card { background:rgba(197,160,40,.06); border:1px solid rgba(197,160,40,.25); border-radius:10px; padding:1rem 1.25rem; margin-bottom:1.25rem; }
  .reg-recruiter-title { font-family:'Barlow Condensed',sans-serif; font-size:.85rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#7a5c10; margin-bottom:.375rem; }
  .reg-recruiter-desc { font-family:'Barlow',sans-serif; font-size:.8rem; color:#8a6e1a; line-height:1.5; margin-bottom:.875rem; }

  .reg-error { display:flex; align-items:flex-start; gap:8px; background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#8a1020; margin-bottom:1rem; line-height:1.5; }

  .reg-submit { width:100%; padding:13px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; border:none; border-radius:8px; cursor:pointer; transition:opacity .2s; margin-top:.5rem; }
  .reg-submit:hover:not(:disabled) { opacity:.88; }
  .reg-submit:disabled { opacity:.45; cursor:not-allowed; }

  .reg-skip { width:100%; padding:10px; font-family:'Barlow Condensed',sans-serif; font-size:.85rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; background:transparent; color:#aaa; border:1.5px solid rgba(0,0,0,.1); border-radius:8px; cursor:pointer; margin-top:.5rem; transition:all .15s; }
  .reg-skip:hover { border-color:#888; color:#555; }

  .reg-back { width:100%; padding:10px; font-family:'Barlow Condensed',sans-serif; font-size:.85rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; background:transparent; color:#888; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; cursor:pointer; margin-bottom:.75rem; transition:all .15s; }
  .reg-back:hover { border-color:#0a1628; color:#0a1628; }

  .reg-login-link { text-align:center; margin-top:1.25rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#888; }
  .reg-login-link a { color:#0a1628; font-weight:600; text-decoration:none; }
  .reg-login-link a:hover { text-decoration:underline; }
`

export default function Register() {
  const [steg, setSteg] = useState(1)
  const [form, setForm] = useState({ namn: '', email: '', lösenord: '' })
  const [rekryteradAv, setRekryteradAv] = useState('')
  const [deltagare, setDeltagare] = useState([])
  const [laddarDeltagare, setLaddarDeltagare] = useState(false)
  const [fel, setFel] = useState(null)
  const [laddar, setLaddar] = useState(false)
  const { logga_in } = useAuth()
  const navigate = useNavigate()

  // Hämta befintliga deltagare för rekryterare-dropdown
  useEffect(() => {
    async function hämtaDeltagare() {
      setLaddarDeltagare(true)
      try {
        const res = await fetch('/.netlify/functions/participants')
        const data = await res.json()
        setDeltagare(Array.isArray(data) ? data : [])
      } catch {
        setDeltagare([])
      } finally {
        setLaddarDeltagare(false)
      }
    }
    hämtaDeltagare()
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (fel) setFel(null)
  }

  function handleSteg1(e) {
    e.preventDefault()
    if (form.lösenord.length < 6) { setFel('Lösenordet måste vara minst 6 tecken'); return }
    setFel(null)
    setSteg(2)
  }

  async function registrera(rekryterare) {
    setFel(null)
    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rekryterad_av: rekryterare || null }),
      })
      const data = await res.json()
      if (!res.ok) { setFel(data.error); return }

      const loginRes = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, lösenord: form.lösenord }),
      })
      const loginData = await loginRes.json()
      logga_in(loginData)
      navigate('/välkommen')
    } catch {
      setFel('Något gick fel, försök igen')
    } finally {
      setLaddar(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="reg-wrap">
        <p className="reg-eyebrow">VM-tipsen 2026</p>
        <h1 className="reg-title">Registrera dig</h1>

        {/* Stegindikator */}
        <div className="reg-steps">
          <div className="reg-step">
            <div className={`reg-step-dot ${steg > 1 ? 'done' : 'active'}`}>{steg > 1 ? '✓' : '1'}</div>
            <span className={`reg-step-label ${steg === 1 ? 'active' : ''}`}>Konto</span>
          </div>
          <div className="reg-step-line" />
          <div className="reg-step">
            <div className={`reg-step-dot ${steg === 2 ? 'active' : ''}`}>2</div>
            <span className={`reg-step-label ${steg === 2 ? 'active' : ''}`}>Rekrytering</span>
          </div>
        </div>

        {/* ── Steg 1: Konto ── */}
        {steg === 1 && (
          <>
            <div className="reg-cost-card">
              <p className="reg-cost-title">Vad kostar det?</p>
              <div className="reg-cost-row"><span className="reg-cost-label">🍷 Vinflaska (din insats)</span><span className="reg-cost-value gold">180–220 kr</span></div>
              <div className="reg-cost-row"><span className="reg-cost-label">⚙️ Adminavgift (drift av sidan)</span><span className="reg-cost-value">10 kr</span></div>
              <div className="reg-cost-total">
                <span className="reg-cost-total-label">Totalt att betala</span>
                <span className="reg-cost-total-value">190–230 kr</span>
              </div>
              <p className="reg-cost-note">Du väljer vinflaska och swishar totalkostnaden efter registreringen.</p>
            </div>
            <div className="reg-form-card">
              <form onSubmit={handleSteg1}>
                {fel && <div className="reg-error"><span>⚠️</span><span>{fel}</span></div>}
                <div className="reg-field">
                  <label className="reg-label">Namn</label>
                  <input type="text" name="namn" value={form.namn} onChange={handleChange} required placeholder="Anna Svensson" className="reg-input" />
                </div>
                <div className="reg-field">
                  <label className="reg-label">E-post</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="anna@exempel.se" className="reg-input" />
                </div>
                <div className="reg-field">
                  <label className="reg-label">Lösenord</label>
                  <input type="password" name="lösenord" value={form.lösenord} onChange={handleChange} required minLength={6} placeholder="Minst 6 tecken" className="reg-input" />
                  <p className="reg-hint">Minst 6 tecken</p>
                </div>
                <button type="submit" className="reg-submit">Nästa →</button>
              </form>
              <p className="reg-login-link">Har du redan ett konto? <Link to="/login">Logga in här</Link></p>
            </div>
          </>
        )}

        {/* ── Steg 2: Rekrytering ── */}
        {steg === 2 && (
          <div className="reg-form-card">
            {fel && <div className="reg-error"><span>⚠️</span><span>{fel}</span></div>}

            <div className="reg-recruiter-card">
              <p className="reg-recruiter-title">🍷 Rekryteringstävling</p>
              <p className="reg-recruiter-desc">
                Den som värvar flest deltagare vinner en extra vinflaska! Vet du vem som bjöd in dig? Välj dem nedan — du kan också göra det senare under "Min vinflaska".
              </p>
              <div className="reg-field" style={{ marginBottom: 0 }}>
                <label className="reg-label">
                  Vem rekryterade dig?
                  <span className="reg-label-opt">(valfritt)</span>
                </label>
                {laddarDeltagare ? (
                  <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'.85rem', color:'#aaa', padding:'10px 0' }}>Laddar deltagare...</div>
                ) : (
                  <select className="reg-select" value={rekryteradAv} onChange={e => setRekryteradAv(e.target.value)}>
                    <option value="">— Välj rekryterare —</option>
                    {deltagare.map(d => (
                      <option key={d.user_id} value={d.user_id}>{d.namn}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <button type="button" className="reg-back" onClick={() => { setSteg(1); setFel(null) }}>← Tillbaka</button>
            <button
              type="button"
              className="reg-submit"
              disabled={laddar}
              onClick={() => registrera(rekryteradAv)}
            >
              {laddar ? 'Skapar konto...' : rekryteradAv ? 'Spara & skapa konto →' : 'Skapa konto →'}
            </button>
            <button
              type="button"
              className="reg-skip"
              disabled={laddar}
              onClick={() => registrera(null)}
            >
              Hoppa över — välj senare
            </button>
          </div>
        )}
      </div>
    </>
  )
}