import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .rp-page {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem;
    position: relative; overflow: hidden;
  }
  .rp-page::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(197,160,40,0.08) 0%, transparent 60%);
  }
  .rp-card {
    width: 100%; max-width: 400px;
    background: #fff; border-radius: 14px;
    padding: 2rem 1.75rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    position: relative; z-index: 1;
  }
  .rp-icon { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
  .rp-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #0a1628;
    letter-spacing: 0.04em; text-transform: uppercase;
    margin-bottom: 0.5rem; text-align: center;
  }
  .rp-sub {
    font-family: 'Barlow', sans-serif;
    font-size: 0.85rem; color: #888; line-height: 1.6;
    text-align: center; margin-bottom: 1.5rem;
  }
  .rp-label {
    display: block; font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 600; color: #0a1628; margin-bottom: 5px;
  }
  .rp-input {
    width: 100%; padding: 11px 14px;
    font-family: 'Barlow', sans-serif; font-size: 0.92rem;
    border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px;
    background: #fff; color: #0a1628; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
    margin-bottom: 1rem;
  }
  .rp-input:focus { border-color: #C5A028; box-shadow: 0 0 0 3px rgba(197,160,40,0.12); }
  .rp-hint { font-family:'Barlow',sans-serif; font-size:.73rem; color:#aaa; margin-top:-10px; margin-bottom:1rem; }
  .rp-btn {
    width: 100%; padding: 13px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060; border: none; border-radius: 8px;
    cursor: pointer; transition: opacity 0.2s;
  }
  .rp-btn:hover:not(:disabled) { opacity: 0.88; }
  .rp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .rp-success {
    text-align: center;
    font-family: 'Barlow', sans-serif; font-size: 0.88rem;
    color: #0a1628; line-height: 1.6;
  }
  .rp-success p { margin-bottom: 1rem; }
  .rp-login-btn {
    display: block; text-decoration: none; text-align: center;
    padding: 12px; border-radius: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.9rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535); color: #fff;
    transition: opacity 0.2s;
  }
  .rp-login-btn:hover { opacity: 0.88; }
  .rp-error {
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 8px; padding: 0.875rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #8a1020; margin-bottom: 1rem; line-height: 1.5;
  }
  .rp-invalid {
    text-align: center; padding: 1rem 0;
    font-family: 'Barlow', sans-serif; font-size: 0.88rem; color: #888;
  }
  .rp-back {
    display: block; text-align: center; margin-top: 1.25rem;
    font-family: 'Barlow', sans-serif; font-size: 0.82rem;
    color: #aaa; text-decoration: none; transition: color 0.15s;
  }
  .rp-back:hover { color: #555; }
`

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [lösenord, setLösenord] = useState('')
  const [bekräfta, setBekräfta] = useState('')
  const [klart, setKlart] = useState(false)
  const [laddar, setLaddar] = useState(false)
  const [fel, setFel] = useState(null)

  // Redirecta till login efter 3 sek när klart
  useEffect(() => {
    if (klart) {
      const t = setTimeout(() => navigate('/login'), 3000)
      return () => clearTimeout(t)
    }
  }, [klart, navigate])

  if (!token) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="rp-page">
          <div className="rp-card">
            <div className="rp-icon">❌</div>
            <h1 className="rp-title">Ogiltig länk</h1>
            <p className="rp-invalid">
              Länken är ogiltig eller har gått ut.
              Begär en ny återställningslänk.
            </p>
            <Link to="/glomt-losenord" className="rp-login-btn" style={{ marginTop:'1rem' }}>
              Begär ny länk
            </Link>
          </div>
        </div>
      </>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)

    if (lösenord !== bekräfta) {
      setFel('Lösenorden matchar inte')
      return
    }
    if (lösenord.length < 6) {
      setFel('Lösenordet måste vara minst 6 tecken')
      return
    }

    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/auth-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lösenord }),
      })
      const data = await res.json()
      if (res.ok) {
        setKlart(true)
      } else {
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
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-icon">{klart ? '✅' : '🔒'}</div>
          <h1 className="rp-title">{klart ? 'Klart!' : 'Nytt lösenord'}</h1>

          {klart ? (
            <div className="rp-success">
              <p>Ditt lösenord är uppdaterat. Du skickas till inloggningen om några sekunder...</p>
              <Link to="/login" className="rp-login-btn">Logga in nu</Link>
            </div>
          ) : (
            <>
              <p className="rp-sub">Välj ett nytt lösenord för ditt konto.</p>
              <form onSubmit={handleSubmit}>
                {fel && <div className="rp-error">⚠️ {fel}</div>}
                <label className="rp-label">Nytt lösenord</label>
                <input
                  type="password"
                  value={lösenord}
                  onChange={(e) => setLösenord(e.target.value)}
                  required
                  placeholder="Minst 6 tecken"
                  className="rp-input"
                />
                <p className="rp-hint">Minst 6 tecken</p>
                <label className="rp-label">Bekräfta lösenord</label>
                <input
                  type="password"
                  value={bekräfta}
                  onChange={(e) => setBekräfta(e.target.value)}
                  required
                  placeholder="Upprepa lösenordet"
                  className="rp-input"
                />
                <button type="submit" disabled={laddar} className="rp-btn">
                  {laddar ? 'Sparar...' : 'Spara nytt lösenord'}
                </button>
              </form>
            </>
          )}

          {!klart && (
            <Link to="/login" className="rp-back">← Tillbaka till inloggning</Link>
          )}
        </div>
      </div>
    </>
  )
}