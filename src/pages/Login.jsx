/**
 * Login.jsx — i18n
 * Alla hårdkodade strängar ersatta med t()-anrop.
 * CSS/STYLES är oförändrad från original.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function Login() {
  const [form, setForm]   = useState({ email: '', lösenord: '' })
  const [fel, setFel]     = useState(null)
  const [laddar, setLaddar] = useState(false)
  const { logga_in }      = useAuth()
  const { t }             = useLanguage()
  const navigate          = useNavigate()

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
  )
}
