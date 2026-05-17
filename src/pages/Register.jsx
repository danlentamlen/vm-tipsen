/**
 * Register.jsx — i18n
 * Alla synliga strängar ersatta med t()-anrop.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const STYLES = `
  .reg-wrap {
    max-width: 520px; margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }
  .reg-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem;
  }
  .reg-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1;
    margin-bottom: 1.75rem;
  }

  /* Stegindikator */
  .reg-steps {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 2rem;
  }
  .reg-step { display: flex; align-items: center; gap: 8px; }
  .reg-step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.82rem; font-weight: 700;
    background: rgba(0,0,0,0.07); color: #aaa;
    transition: all 0.2s;
  }
  .reg-step-dot.active { background: #0a1628; color: #F0D060; }
  .reg-step-dot.done   { background: #2a7a2a; color: #fff; }
  .reg-step-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: #bbb;
  }
  .reg-step-label.active { color: #0a1628; }
  .reg-step-line {
    flex: 1; height: 1px; background: rgba(0,0,0,0.1);
    margin: 0 12px;
  }

  /* Kostnadsruta */
  .reg-cost-card {
    background: linear-gradient(135deg, rgba(197,160,40,0.08), rgba(197,160,40,0.04));
    border: 1px solid rgba(197,160,40,0.25);
    border-radius: 12px; padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }
  .reg-cost-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #8a6e1a; margin-bottom: 0.875rem;
  }
  .reg-cost-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.375rem 0;
    font-family: 'Barlow', sans-serif; font-size: 0.88rem;
    border-bottom: 1px solid rgba(197,160,40,0.15);
  }
  .reg-cost-row:last-of-type { border-bottom: none; }
  .reg-cost-label { color: #555; }
  .reg-cost-value { font-weight: 600; color: #0a1628; }
  .reg-cost-value.gold { color: #8a6e1a; }
  .reg-cost-total {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 0.75rem; padding-top: 0.75rem;
    border-top: 2px solid rgba(197,160,40,0.3);
    font-family: 'Barlow Condensed', sans-serif;
  }
  .reg-cost-total-label {
    font-size: 0.82rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #0a1628;
  }
  .reg-cost-total-value {
    font-size: 1.1rem; font-weight: 700; color: #C5A028;
  }
  .reg-cost-note {
    font-family: 'Barlow', sans-serif; font-size: 0.78rem;
    color: #aaa; margin-top: 0.75rem; line-height: 1.5;
  }

  /* Formulärkort */
  .reg-form-card {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px; padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .reg-error {
    display: flex; align-items: center; gap: 8px;
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 8px; padding: 0.75rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #8a1020; margin-bottom: 1rem;
  }
  .reg-field { margin-bottom: 1rem; }
  .reg-label {
    display: block; font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 600; color: #0a1628; margin-bottom: 5px;
  }
  .reg-input {
    width: 100%; padding: 11px 14px; box-sizing: border-box;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .reg-input:focus { border-color: #C5A028; box-shadow: 0 0 0 3px rgba(197,160,40,0.12); }
  .reg-hint {
    font-family: 'Barlow', sans-serif; font-size: 0.76rem;
    color: #aaa; margin-top: 4px;
  }
  .reg-submit {
    width: 100%; padding: 13px; margin-top: 0.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; border-radius: 8px;
    cursor: pointer; transition: opacity 0.2s;
  }
  .reg-submit:hover:not(:disabled) { opacity: 0.88; }
  .reg-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .reg-login-link {
    font-family: 'Barlow', sans-serif; font-size: 0.82rem;
    color: #aaa; text-align: center; margin-top: 1rem;
  }
  .reg-login-link a { color: #0a1628; font-weight: 600; text-decoration: none; }
  .reg-login-link a:hover { text-decoration: underline; }

  /* Steg 2 */
  .reg-sub-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.1rem; font-weight: 700; color: #0a1628;
    letter-spacing: 0.04em; margin-bottom: 0.5rem;
  }
  .reg-sub-desc {
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #666; line-height: 1.6; margin-bottom: 1.25rem;
  }
  .reg-select {
    width: 100%; padding: 11px 14px; box-sizing: border-box;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    margin-bottom: 1rem; cursor: pointer;
    transition: border-color 0.15s;
  }
  .reg-select:focus { border-color: #C5A028; }
  .reg-skip {
    width: 100%; padding: 12px; margin-top: 0.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    background: #f0ede6; color: #666;
    border: none; border-radius: 8px;
    cursor: pointer; transition: background 0.15s;
  }
  .reg-skip:hover:not(:disabled) { background: #e8e4dc; }
  .reg-skip:disabled { opacity: 0.4; cursor: not-allowed; }
  .reg-back {
    display: block; width: 100%; padding: 10px; margin-top: 0.5rem;
    font-family: 'Barlow', sans-serif; font-size: 0.82rem;
    color: #aaa; background: none; border: none;
    cursor: pointer; text-align: center;
    transition: color 0.15s;
  }
  .reg-back:hover { color: #555; }
`

export default function Register() {
  const [steg, setSteg]                       = useState(1)
  const [form, setForm]                       = useState({ namn: '', email: '', lösenord: '' })
  const [rekryteradAv, setRekryteradAv]       = useState('')
  const [deltagare, setDeltagare]             = useState([])
  const [laddarDeltagare, setLaddarDeltagare] = useState(false)
  const [fel, setFel]                         = useState(null)
  const [laddar, setLaddar]                   = useState(false)
  const { logga_in }                          = useAuth()
  const { t }                                 = useLanguage()
  const navigate                              = useNavigate()

  useEffect(() => {
    async function hämtaDeltagare() {
      setLaddarDeltagare(true)
      try {
        const res  = await fetch('/.netlify/functions/participants')
        const data = await res.json()
        setDeltagare(Array.isArray(data) ? data : [])
      } catch { setDeltagare([]) }
      finally { setLaddarDeltagare(false) }
    }
    hämtaDeltagare()
  }, [])

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); if (fel) setFel(null) }

  function handleSteg1(e) {
    e.preventDefault()
    if (form.lösenord.length < 6) { setFel(t('register.lösenordKort')); return }
    setFel(null); setSteg(2)
  }

  async function registrera(rekryterare) {
    setFel(null); setLaddar(true)
    try {
      const res  = await fetch('/.netlify/functions/auth-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rekryterad_av: rekryterare || null }),
      })
      const data = await res.json()
      if (!res.ok) { setFel(data.error); return }
      const loginRes  = await fetch('/.netlify/functions/auth-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, lösenord: form.lösenord }),
      })
      const loginData = await loginRes.json()
      logga_in(loginData); navigate('/välkommen')
    } catch { setFel(t('register.felGenerellt')) }
    finally { setLaddar(false) }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="reg-wrap">
        <p className="reg-eyebrow">{t('register.eyebrow')}</p>
        <h1 className="reg-title">{t('register.titel')}</h1>

        {/* Stegindikator */}
        <div className="reg-steps">
          <div className="reg-step">
            <div className={`reg-step-dot ${steg > 1 ? 'done' : 'active'}`}>{steg > 1 ? '✓' : '1'}</div>
            <span className={`reg-step-label ${steg === 1 ? 'active' : ''}`}>{t('register.steg.konto')}</span>
          </div>
          <div className="reg-step-line" />
          <div className="reg-step">
            <div className={`reg-step-dot ${steg === 2 ? 'active' : ''}`}>2</div>
            <span className={`reg-step-label ${steg === 2 ? 'active' : ''}`}>{t('register.steg.rekrytering')}</span>
          </div>
        </div>

        {/* ── Steg 1 ── */}
        {steg === 1 && (
          <>
            <div className="reg-cost-card">
              <p className="reg-cost-title">{t('register.kostnad.titel')}</p>
              <div className="reg-cost-row">
                <span className="reg-cost-label">{t('register.kostnad.vinflaska')}</span>
                <span className="reg-cost-value gold">{t('register.kostnad.vinIntervall')}</span>
              </div>
              <div className="reg-cost-row">
                <span className="reg-cost-label">{t('register.kostnad.adminavgift')}</span>
                <span className="reg-cost-value">{t('register.kostnad.adminavgiftKr')}</span>
              </div>
              <div className="reg-cost-total">
                <span className="reg-cost-total-label">{t('register.kostnad.totalt')}</span>
                <span className="reg-cost-total-value">{t('register.kostnad.totaltIntervall')}</span>
              </div>
              <p className="reg-cost-note">{t('register.kostnad.not')}</p>
            </div>

            <div className="reg-form-card">
              <form onSubmit={handleSteg1}>
                {fel && <div className="reg-error"><span>⚠️</span><span>{fel}</span></div>}
                <div className="reg-field">
                  <label className="reg-label">{t('register.namn')}</label>
                  <input type="text" name="namn" value={form.namn} onChange={handleChange} required placeholder={t('register.namnPlaceholder')} className="reg-input" />
                </div>
                <div className="reg-field">
                  <label className="reg-label">{t('register.email')}</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder={t('register.emailPlaceholder')} className="reg-input" />
                </div>
                <div className="reg-field">
                  <label className="reg-label">{t('register.lösenord')}</label>
                  <input type="password" name="lösenord" value={form.lösenord} onChange={handleChange} required minLength={6} placeholder={t('register.lösenordPlaceholder')} className="reg-input" />
                  <p className="reg-hint">{t('register.lösenordHint')}</p>
                </div>
                <button type="submit" className="reg-submit">{t('register.nästa')}</button>
              </form>
              <p className="reg-login-link">{t('register.harKonto')} <Link to="/login">{t('register.loggaIn')}</Link></p>
            </div>
          </>
        )}

        {/* ── Steg 2 ── */}
        {steg === 2 && (
          <div className="reg-form-card">
            <h2 className="reg-sub-title">{t('register.rekrytering.titel')}</h2>
            <p className="reg-sub-desc">{t('register.rekrytering.beskr')}</p>

            {fel && <div className="reg-error"><span>⚠️</span><span>{fel}</span></div>}

            <select
              value={rekryteradAv}
              onChange={e => setRekryteradAv(e.target.value)}
              className="reg-select"
              disabled={laddarDeltagare}
            >
              <option value="">{laddarDeltagare ? t('register.rekrytering.söker') : t('register.rekrytering.välj')}</option>
              {deltagare.map(d => (
                <option key={d.user_id} value={d.user_id}>{d.namn}</option>
              ))}
            </select>

            <button onClick={() => registrera(rekryteradAv)} disabled={laddar} className="reg-submit">
              {laddar ? t('register.rekrytering.registrerar') : t('register.rekrytering.registrera')}
            </button>
            <button onClick={() => registrera(null)} disabled={laddar} className="reg-skip">
              {t('register.rekrytering.hoppaÖver')}
            </button>
            <button onClick={() => { setSteg(1); setFel(null) }} className="reg-back">
              {t('register.rekrytering.tillbaka')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}