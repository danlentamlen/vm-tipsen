/**
 * Register.jsx — i18n
 * Alla synliga strängar ersatta med t()-anrop.
 * Logik och CSS är oförändrad från original.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function Register() {
  const [steg, setSteg]               = useState(1)
  const [form, setForm]               = useState({ namn: '', email: '', lösenord: '' })
  const [rekryteradAv, setRekryteradAv] = useState('')
  const [deltagare, setDeltagare]     = useState([])
  const [laddarDeltagare, setLaddarDeltagare] = useState(false)
  const [fel, setFel]                 = useState(null)
  const [laddar, setLaddar]           = useState(false)
  const { logga_in }                  = useAuth()
  const { t }                         = useLanguage()
  const navigate                      = useNavigate()

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
  )
}
