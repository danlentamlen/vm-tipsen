/**
 * Login.jsx — i18n
 * Alla hårdkodade strängar ersatta med t()-anrop.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const STYLES = `
  .login-page {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem;
    position: relative; overflow: hidden;
  }
  .login-page::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 30%, rgba(197,160,40,0.1) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 70%, rgba(200,16,46,0.08) 0%, transparent 55%);
  }
  .login-card {
    width: 100%; max-width: 400px;
    background: #fff; border-radius: 16px;
    padding: 2.5rem 2rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    position: relative; z-index: 1;
  }
  .login-brand { text-align: center; margin-bottom: 1.75rem; }
  .login-ball { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .login-brand-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.1rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #0a1628; margin: 0;
  }
  .login-brand-sub {
    font-family: 'Barlow', sans-serif;
    font-size: 0.78rem; color: #aaa; margin: 2px 0 0;
  }
  .login-form-wrap { margin-bottom: 1.25rem; }
  .login-form-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #0a1628;
    letter-spacing: 0.04em; text-transform: uppercase;
    margin: 0 0 1.25rem;
  }
  .login-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 8px; padding: 0.75rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #8a1020; margin-bottom: 1rem;
  }
  .login-field { margin-bottom: 1rem; }
  .login-label {
    display: block; font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 600; color: #0a1628; margin-bottom: 5px;
  }
  .login-input {
    width: 100%; padding: 11px 14px; box-sizing: border-box;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .login-input:focus { border-color: #C5A028; box-shadow: 0 0 0 3px rgba(197,160,40,0.12); }
  .login-submit {
    width: 100%; padding: 13px; margin-top: 0.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; border-radius: 8px;
    cursor: pointer; transition: opacity 0.2s;
  }
  .login-submit:hover:not(:disabled) { opacity: 0.88; }
  .login-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .login-divider {
    display: flex; align-items: center; gap: 10px;
    margin: 1.25rem 0 1rem;
  }
  .login-divider-line { flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
  .login-divider-text {
    font-family: 'Barlow', sans-serif; font-size: 0.78rem; color: #bbb;
    white-space: nowrap;
  }
  .login-register {
    display: block; width: 100%; padding: 12px; box-sizing: border-box;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.95rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    background: #f0ede6; color: #0a1628;
    border: none; border-radius: 8px; text-align: center;
    text-decoration: none; transition: background 0.15s;
  }
  .login-register:hover { background: #e8e4dc; }
  .login-perks {
    display: flex; justify-content: center; gap: 16px;
    margin-top: 1.5rem; flex-wrap: wrap;
  }
  .login-perk {
    display: flex; align-items: center; gap: 5px;
    font-family: 'Barlow', sans-serif; font-size: 0.78rem; color: #888;
  }
  .login-perk-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #C5A028; flex-shrink: 0;
  }
`

export default function Login() {
  const [form, setForm]     = useState({ email: '', lösenord: '' })
  const [fel, setFel]       = useState(null)
  const [laddar, setLaddar] = useState(false)
  const { logga_in }        = useAuth()
  const { t }               = useLanguage()
  const navigate            = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (fel) setFel(null)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setFel(null); setLaddar(true)
    try {
      const res  = await fetch('/.netlify/functions/auth-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFel(data.error || t('login.felCredentials')); return }
      logga_in(data); navigate('/')
    } catch { setFel(t('login.felGenerellt')) }
    finally { setLaddar(false) }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-ball">⚽</div>
            <p className="login-brand-title">VM-tipsen 2026</p>
            <p className="login-brand-sub">FIFA World Cup</p>
          </div>

          <div className="login-form-wrap">
            <h1 className="login-form-title">{t('login.titel')}</h1>
            <form onSubmit={handleSubmit}>
              {fel && <div className="login-error"><span>⚠️</span><span>{fel}</span></div>}

              <div className="login-field">
                <label className="login-label">{t('login.email')}</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder={t('login.emailPlaceholder')} className="login-input" />
              </div>

              <div className="login-field">
                <label className="login-label">{t('login.lösenord')}</label>
                <input type="password" name="lösenord" value={form.lösenord} onChange={handleChange} required autoComplete="current-password" placeholder="••••••••" className="login-input" />
              </div>

              <button type="submit" disabled={laddar} className="login-submit">
                {laddar ? t('login.laddar') : t('login.loggaIn')}
              </button>
            </form>

            <div style={{ textAlign:'right', marginTop:'0.5rem', marginBottom:'0.25rem' }}>
              <Link to="/glomt-losenord" style={{ fontFamily:"'Barlow',sans-serif", fontSize:'0.8rem', color:'#aaa', textDecoration:'none' }}>
                {t('login.glömtLösenord')}
              </Link>
            </div>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">{t('login.nyttHär')}</span>
              <div className="login-divider-line" />
            </div>

            <Link to="/register" className="login-register">{t('login.skapaKonto')}</Link>
          </div>

          <div className="login-perks">
            <span className="login-perk"><span className="login-perk-dot" />{t('login.perks.matcher')}</span>
            <span className="login-perk"><span className="login-perk-dot" />{t('login.perks.vinpott')}</span>
            <span className="login-perk"><span className="login-perk-dot" />{t('login.perks.frågor')}</span>
          </div>
        </div>
      </div>
    </>
  )
}