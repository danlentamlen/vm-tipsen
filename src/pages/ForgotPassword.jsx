import { useState } from 'react'
import { Link } from 'react-router-dom'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .fp-page {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem;
    position: relative; overflow: hidden;
  }
  .fp-page::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(200,16,46,0.1) 0%, transparent 60%);
  }
  .fp-card {
    width: 100%; max-width: 400px;
    background: #fff; border-radius: 14px;
    padding: 2rem 1.75rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    position: relative; z-index: 1;
  }
  .fp-icon { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
  .fp-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #0a1628;
    letter-spacing: 0.04em; text-transform: uppercase;
    margin-bottom: 0.5rem; text-align: center;
  }
  .fp-sub {
    font-family: 'Barlow', sans-serif;
    font-size: 0.85rem; color: #888; line-height: 1.6;
    text-align: center; margin-bottom: 1.5rem;
  }
  .fp-label {
    display: block; font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 600; color: #0a1628; margin-bottom: 5px;
  }
  .fp-input {
    width: 100%; padding: 11px 14px;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
  }
  .fp-input:focus { border-color: #C5A028; box-shadow: 0 0 0 3px rgba(197,160,40,0.12); }
  .fp-btn {
    width: 100%; padding: 13px; margin-top: 1rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; border-radius: 8px;
    cursor: pointer; transition: opacity 0.2s;
  }
  .fp-btn:hover:not(:disabled) { opacity: 0.88; }
  .fp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fp-success {
    background: rgba(10,22,40,0.05); border: 1px solid rgba(10,22,40,0.12);
    border-radius: 10px; padding: 1rem; text-align: center;
    font-family: 'Barlow', sans-serif; font-size: 0.88rem;
    color: #0a1628; line-height: 1.6; margin-top: 1rem;
  }
  .fp-error {
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 8px; padding: 0.75rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #8a1020; margin-bottom: 1rem;
  }
  .fp-back {
    display: block; text-align: center; margin-top: 1.25rem;
    font-family: 'Barlow', sans-serif; font-size: 0.82rem;
    color: #aaa; text-decoration: none; transition: color 0.15s;
  }
  .fp-back:hover { color: #555; }
`

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [skickat, setSkickat] = useState(false)
  const [laddar, setLaddar] = useState(false)
  const [fel, setFel] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)
    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/auth-forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSkickat(true)
      } else {
        const data = await res.json()
        setFel(data.error || 'Något gick fel')
      }
    } catch {
      setFel('Något gick fel, försök igen')
    } finally {
      setLaddar(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="fp-page">
        <div className="fp-card">
          <div className="fp-icon">🔑</div>
          <h1 className="fp-title">Glömt lösenord?</h1>
          <p className="fp-sub">
            Ange din email så skickar vi en länk för att återställa ditt lösenord.
          </p>

          {!skickat ? (
            <form onSubmit={handleSubmit}>
              {fel && <div className="fp-error">⚠️ {fel}</div>}
              <label className="fp-label">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="anna@exempel.se"
                className="fp-input"
              />
              <button type="submit" disabled={laddar} className="fp-btn">
                {laddar ? 'Skickar...' : 'Skicka återställningslänk'}
              </button>
            </form>
          ) : (
            <div className="fp-success">
              ✅ Om emailen finns i vårt system har vi skickat en återställningslänk.
              Kolla din inkorg — och skräpposten om du inte hittar den!
            </div>
          )}

          <Link to="/login" className="fp-back">← Tillbaka till inloggning</Link>
        </div>
      </div>
    </>
  )
}