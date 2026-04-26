import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .login-page {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    position: relative;
    overflow: hidden;
  }
  .login-page::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 30% 30%, rgba(200,16,46,0.1) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 75% 75%, rgba(197,160,40,0.07) 0%, transparent 55%);
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    position: relative;
    z-index: 1;
  }

  /* Header */
  .login-brand {
    text-align: center;
    margin-bottom: 2rem;
  }
  .login-ball {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, #C5A028, #F0D060);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; margin: 0 auto 0.875rem;
    box-shadow: 0 4px 16px rgba(197,160,40,0.3);
  }
  .login-brand-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.5rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #F0D060; line-height: 1;
    margin-bottom: 0.2rem;
  }
  .login-brand-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: rgba(255,255,255,0.35);
  }

  /* Form container */
  .login-form-wrap {
    background: #fff;
    border-radius: 14px;
    padding: 2rem 1.75rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  .login-form-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.3rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; color: #0a1628;
    margin-bottom: 1.5rem;
  }

  /* Fields */
  .login-field { margin-bottom: 1.1rem; }
  .login-label {
    display: block;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem; font-weight: 600; color: #0a1628;
    margin-bottom: 5px; letter-spacing: 0.02em;
  }
  .login-input {
    width: 100%; padding: 11px 14px;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .login-input:focus {
    border-color: #C5A028;
    box-shadow: 0 0 0 3px rgba(197,160,40,0.12);
  }

  /* Error */
  .login-error {
    display: flex; align-items: flex-start; gap: 8px;
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 8px; padding: 0.75rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #8a1020; margin-bottom: 1.1rem; line-height: 1.5;
  }

  /* Submit */
  .login-submit {
    width: 100%; padding: 13px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; border-radius: 8px;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    margin-top: 0.25rem;
  }
  .login-submit:hover:not(:disabled) {
    opacity: 0.88; transform: translateY(-1px);
  }
  .login-submit:active:not(:disabled) { transform: translateY(0); }
  .login-submit:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Divider */
  .login-divider {
    display: flex; align-items: center; gap: 10px;
    margin: 1.25rem 0;
  }
  .login-divider-line { flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
  .login-divider-text {
    font-family: 'Barlow', sans-serif;
    font-size: 0.72rem; color: #ccc; letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* Register link */
  .login-register {
    display: block; text-align: center; text-decoration: none;
    padding: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase;
    background: transparent;
    color: #0a1628;
    border: 1.5px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    transition: border-color 0.15s, background 0.15s;
  }
  .login-register:hover {
    border-color: #0a1628;
    background: rgba(10,22,40,0.04);
  }

  /* Perks strip */
  .login-perks {
    display: flex; justify-content: center; gap: 1.5rem;
    margin-top: 1.75rem; flex-wrap: wrap;
  }
  .login-perk {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Barlow', sans-serif;
    font-size: 0.73rem; color: rgba(255,255,255,0.4);
  }
  .login-perk-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(197,160,40,0.5); flex-shrink: 0;
  }

  @media (max-width: 440px) {
    .login-form-wrap { padding: 1.5rem 1.25rem; border-radius: 12px; }
  }
`

export default function Login() {
  const [form, setForm] = useState({ email: '', lösenord: '' })
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
      const res = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setFel(data.error || 'Fel e-post eller lösenord')
        return
      }

      logga_in(data)
      navigate('/')
    } catch {
      setFel('Något gick fel, försök igen')
    } finally {
      setLaddar(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-page">
        <div className="login-card">

          {/* Brand */}
          <div className="login-brand">
            <div className="login-ball">⚽</div>
            <p className="login-brand-title">VM-tipsen 2026</p>
            <p className="login-brand-sub">FIFA World Cup</p>
          </div>

          {/* Form */}
          <div className="login-form-wrap">
            <h1 className="login-form-title">Logga in</h1>

            <form onSubmit={handleSubmit}>
              {fel && (
                <div className="login-error">
                  <span>⚠️</span>
                  <span>{fel}</span>
                </div>
              )}

              <div className="login-field">
                <label className="login-label">E-post</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="anna@exempel.se"
                  className="login-input"
                />
              </div>

              <div className="login-field">
                <label className="login-label">Lösenord</label>
                <input
                  type="password"
                  name="lösenord"
                  value={form.lösenord}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="login-input"
                />
              </div>

              <button
                type="submit"
                disabled={laddar}
                className="login-submit"
              >
                {laddar ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">Nytt här?</span>
              <div className="login-divider-line" />
            </div>

            <Link to="/register" className="login-register">
              Skapa konto
            </Link>
          </div>

          {/* Perks */}
          <div className="login-perks">
            <span className="login-perk">
              <span className="login-perk-dot" />104 matcher
            </span>
            <span className="login-perk">
              <span className="login-perk-dot" />Vinpott
            </span>
            <span className="login-perk">
              <span className="login-perk-dot" />Tilläggsfrågor
            </span>
          </div>

        </div>
      </div>
    </>
  )
}