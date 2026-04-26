import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .reg-wrap { max-width: 480px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .reg-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .reg-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.5rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  .reg-cost-card { background:linear-gradient(135deg,#0a1628,#1a2e4a); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.75rem; }
  .reg-cost-title { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.4); margin-bottom:.875rem; }
  .reg-cost-row { display:flex; justify-content:space-between; align-items:center; padding:.4rem 0; font-family:'Barlow',sans-serif; font-size:.88rem; border-bottom:1px solid rgba(255,255,255,.06); }
  .reg-cost-row:last-of-type { border-bottom:none; }
  .reg-cost-label { color:rgba(255,255,255,.55); }
  .reg-cost-value { color:#fff; font-weight:500; }
  .reg-cost-value.gold { color:#F0D060; }
  .reg-cost-total { display:flex; justify-content:space-between; align-items:baseline; margin-top:.875rem; padding-top:.875rem; border-top:1px solid rgba(197,160,40,.3); }
  .reg-cost-total-label { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.4); }
  .reg-cost-total-value { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; color:#F0D060; }
  .reg-cost-note { font-family:'Barlow',sans-serif; font-size:.73rem; color:rgba(255,255,255,.35); margin-top:.75rem; line-height:1.5; }

  .reg-form-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem; box-shadow:0 2px 12px rgba(0,0,0,.06); }
  .reg-field { margin-bottom:1rem; }
  .reg-label { display:block; font-family:'Barlow',sans-serif; font-size:.82rem; font-weight:600; color:#0a1628; margin-bottom:5px; }
  .reg-input { width:100%; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:.9rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; background:#fff; color:#0a1628; outline:none; transition:border-color .15s; box-sizing:border-box; }
  .reg-input:focus { border-color:#C5A028; }
  .reg-hint { font-family:'Barlow',sans-serif; font-size:.73rem; color:#aaa; margin-top:4px; line-height:1.4; }

  .reg-error { display:flex; align-items:flex-start; gap:8px; background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#8a1020; margin-bottom:1rem; line-height:1.5; }

  .reg-submit { width:100%; padding:13px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; border:none; border-radius:8px; cursor:pointer; transition:opacity .2s; margin-top:.5rem; }
  .reg-submit:hover:not(:disabled) { opacity:.88; }
  .reg-submit:disabled { opacity:.45; cursor:not-allowed; }

  .reg-login-link { text-align:center; margin-top:1.25rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#888; }
  .reg-login-link a { color:#0a1628; font-weight:600; text-decoration:none; }
  .reg-login-link a:hover { text-decoration:underline; }
`

export default function Register() {
  const [form, setForm] = useState({ namn: '', email: '', lösenord: '' })
  const [fel, setFel] = useState(null)
  const [laddar, setLaddar] = useState(false)
  const { logga_in } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (fel) setFel(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)
    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      navigate('/välkommen')   // ← redirect till välkomstsidan
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
          <form onSubmit={handleSubmit}>
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
            <button type="submit" disabled={laddar} className="reg-submit">
              {laddar ? 'Skapar konto...' : 'Skapa konto & välj vinflaska →'}
            </button>
          </form>
          <p className="reg-login-link">Har du redan ett konto? <Link to="/login">Logga in här</Link></p>
        </div>
      </div>
    </>
  )
}