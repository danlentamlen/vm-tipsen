import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { användare } = useAuth()
  const [ticker, setTicker] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/.netlify/functions/participants').then((r) => r.json()).catch(() => []),
      fetch('/.netlify/functions/viner-hamta').then((r) => r.json()).catch(() => []),
    ]).then(([deltagare, viner]) => {
      const antalDeltagare = Array.isArray(deltagare) ? deltagare.length : 0
      const betalda = Array.isArray(viner) ? viner.filter((v) => v.betalt === 'betalt') : []
      const pottVärde = betalda.reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)
      setTicker({ antalDeltagare, antalBetalda: betalda.length, pottVärde })
    })
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@400;500&display=swap');

        .home-hero {
          min-height: calc(100svh - 60px);
          background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
          display: flex;
          align-items: center;
          padding: 3rem 1.5rem 4rem;
          position: relative;
          overflow: hidden;
        }
        .home-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 50% 30%, rgba(200,16,46,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 80% 80%, rgba(197,160,40,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 680px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(197,160,40,0.12);
          border: 1px solid rgba(197,160,40,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #F0D060;
          margin-bottom: 1.5rem;
        }
        .hero-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(2.8rem, 10vw, 5.5rem);
          font-weight: 700;
          line-height: 0.95;
          letter-spacing: 0.01em;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .hero-title .accent { color: #C8102E; display: block; }
        .hero-subtitle {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1rem, 3vw, 1.3rem);
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 2rem;
        }
        .hero-desc {
          font-family: 'Barlow', sans-serif;
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.7;
          max-width: 480px;
          margin: 0 auto 2.5rem;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3.5rem;
        }
        .btn-primary {
          display: inline-block;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #C8102E, #e01535);
          color: #fff;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-secondary {
          display: inline-block;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,0.8);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.25);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-secondary:hover { border-color: #F0D060; color: #F0D060; }

        .stats-row {
          display: flex;
          justify-content: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 1.5rem 0;
        }
        .stat-item {
          flex: 1;
          max-width: 140px;
          text-align: center;
          padding: 0 1rem;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .stat-item:last-child { border-right: none; }
        .stat-num {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #F0D060;
          line-height: 1;
          display: block;
        }
        .stat-lbl {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-top: 0.25rem;
          display: block;
        }

        /* How it works */
        .how-section {
          background: #f8f7f4;
          padding: 4rem 1.5rem;
        }
        .how-inner { max-width: 760px; margin: 0 auto; }
        .section-eyebrow {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #C8102E;
          margin-bottom: 0.5rem;
        }
        .section-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          font-weight: 700;
          color: #0a1628;
          letter-spacing: 0.02em;
          margin-bottom: 2.5rem;
          line-height: 1;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
        }
        .step-card {
          background: #fff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 12px;
          padding: 1.5rem;
          position: relative;
        }
        .step-num {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 3rem;
          font-weight: 700;
          color: rgba(200,16,46,0.08);
          line-height: 1;
          position: absolute;
          top: 1rem;
          right: 1.25rem;
        }
        .step-icon { font-size: 1.75rem; margin-bottom: 0.75rem; display: block; }
        .step-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #0a1628;
          letter-spacing: 0.03em;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
        }
        .step-desc {
          font-family: 'Barlow', sans-serif;
          font-size: 0.88rem;
          color: #666;
          line-height: 1.6;
        }

        /* Points */
        .points-section {
          background: #fff;
          padding: 4rem 1.5rem;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .points-inner { max-width: 760px; margin: 0 auto; }
        .points-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .points-card {
          border-radius: 10px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .points-card.exact  { background: rgba(200,16,46,0.06);  border: 1px solid rgba(200,16,46,0.15); }
        .points-card.right  { background: rgba(10,22,40,0.05);   border: 1px solid rgba(10,22,40,0.1); }
        .points-card.bonus  { background: rgba(197,160,40,0.08); border: 1px solid rgba(197,160,40,0.25); }
        .points-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }
        .points-card.exact .points-value  { color: #C8102E; }
        .points-card.right .points-value  { color: #0a1628; }
        .points-card.bonus .points-value  { color: #8a6e1a; }
        .points-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #555;
        }
        .points-desc {
          font-family: 'Barlow', sans-serif;
          font-size: 0.8rem;
          color: #888;
          line-height: 1.5;
        }

        /* Wine */
        .wine-section {
          background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%);
          padding: 4rem 1.5rem;
        }
        .wine-inner { max-width: 680px; margin: 0 auto; text-align: center; }
        .wine-icon { font-size: 3.5rem; display: block; margin-bottom: 1rem; }
        .wine-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1.6rem, 5vw, 2.5rem);
          font-weight: 700;
          color: #F0D060;
          letter-spacing: 0.03em;
          margin-bottom: 1rem;
          line-height: 1;
        }
        .wine-desc {
          font-family: 'Barlow', sans-serif;
          font-size: 0.98rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.75;
          max-width: 520px;
          margin: 0 auto 2rem;
        }
        .wine-highlight { color: #F0D060; font-weight: 500; }
        .wine-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 420px;
          margin: 0 auto;
          text-align: left;
        }
        .wine-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 0.875rem 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
        }
        .wine-step-num {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #F0D060;
          background: rgba(197,160,40,0.15);
          border: 1px solid rgba(197,160,40,0.3);
          border-radius: 4px;
          padding: 2px 7px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .wine-step-text {
          font-family: 'Barlow', sans-serif;
          font-size: 0.88rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
        }

        /* Logged in */
        .welcome-section {
          background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%);
          padding: 3rem 1.5rem;
          text-align: center;
        }
        .welcome-inner { max-width: 560px; margin: 0 auto; }
        .welcome-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          font-weight: 700;
          color: #F0D060;
          letter-spacing: 0.03em;
          margin-bottom: 0.5rem;
        }
        .welcome-sub { color: rgba(255,255,255,0.55); font-size: 0.95rem; margin-bottom: 2rem; }
        .quick-links {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          max-width: 400px;
          margin: 0 auto;
        }
        .quick-link {
          text-decoration: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 1rem;
          text-align: center;
          transition: background 0.2s, border-color 0.2s;
        }
        .quick-link:hover { background: rgba(197,160,40,0.1); border-color: rgba(197,160,40,0.3); }
        .quick-link-icon { font-size: 1.5rem; display: block; margin-bottom: 0.35rem; }
        .quick-link-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }

        @media (max-width: 480px) {
          .stat-item { padding: 0 0.6rem; }
          .stat-num { font-size: 1.6rem; }
          .steps-grid, .points-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Hero */}
      <div className="home-hero">
        <div className="hero-inner">
          <div className="hero-eyebrow"><span>⚽</span>FIFA World Cup 2026</div>
          <h1 className="hero-title">
            VM-tipsen
            <span className="accent">2026</span>
          </h1>
          <p className="hero-subtitle">Tippa · Tävla · Vinn</p>
          <p className="hero-desc">
            Tippa matchresultaten, svara på tilläggsfrågor och klättra på topplistan.
            Varje deltagare satsar en vinflaska — den med flest poäng tar hem hela potten!
          </p>
          <div className="hero-actions">
            {!användare ? (
              <>
                <Link to="/register" className="btn-primary">Anmäl dig nu</Link>
                <Link to="/login" className="btn-secondary">Logga in</Link>
              </>
            ) : (
              <>
                <Link to="/matches" className="btn-primary">Lämna dina tips →</Link>
                <Link to="/leaderboard" className="btn-secondary">Se topplistan</Link>
              </>
            )}
          </div>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-num">{ticker ? ticker.antalDeltagare : '—'}</span>
              <span className="stat-lbl">Deltagare</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{ticker?.antalBetalda ?? '—'}</span>
              <span className="stat-lbl">Betalda</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{ticker?.pottVärde > 0 ? `${ticker.pottVärde} kr` : '—'}</span>
              <span className="stat-lbl">Vinvärde</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inloggad */}
      {användare && (
        <div className="welcome-section">
          <div className="welcome-inner">
            <p className="welcome-name">Välkommen, {användare.namn}! 🎉</p>
            <p className="welcome-sub">Vad vill du göra?</p>
            <div className="quick-links">
              <Link to="/matches" className="quick-link">
                <span className="quick-link-icon">📅</span>
                <span className="quick-link-label">Matcher</span>
              </Link>
              <Link to="/leaderboard" className="quick-link">
                <span className="quick-link-icon">🏆</span>
                <span className="quick-link-label">Topplista</span>
              </Link>
              <Link to="/questions" className="quick-link">
                <span className="quick-link-icon">🎯</span>
                <span className="quick-link-label">Tilläggsfrågor</span>
              </Link>
              <Link to="/mitt-vin" className="quick-link">
                <span className="quick-link-icon">🍾</span>
                <span className="quick-link-label">Min vinflaska</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ej inloggad — fullständig förklaring */}
      {!användare && (
        <>
          <div className="how-section">
            <div className="how-inner">
              <p className="section-eyebrow">Så funkar det</p>
              <h2 className="section-title">Tre enkla steg</h2>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">1</span>
                  <span className="step-icon">📝</span>
                  <div className="step-title">Registrera dig</div>
                  <p className="step-desc">Skapa ett konto och välj din vinflaska som insats i potten.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">2</span>
                  <span className="step-icon">⚽</span>
                  <div className="step-title">Tippa & svara</div>
                  <p className="step-desc">Lämna tips på samtliga 104 VM-matcher och svara på tilläggsfrågor innan turneringen börjar.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">3</span>
                  <span className="step-icon">🍷</span>
                  <div className="step-title">Vinn vinpotten</div>
                  <p className="step-desc">Den som toppar listan efter VM-finalen den 19 juli tar hem alla deltagarnas vinflaskor.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="points-section">
            <div className="points-inner">
              <p className="section-eyebrow">Poängsystem</p>
              <h2 className="section-title">Hur poäng räknas</h2>
              <div className="points-grid">
                <div className="points-card exact">
                  <span className="points-value">5p</span>
                  <span className="points-label">Exakt rätt resultat</span>
                  <p className="points-desc">Du gissade exakt rätt antal mål för båda lagen.</p>
                </div>
                <div className="points-card right">
                  <span className="points-value">2p</span>
                  <span className="points-label">Rätt utgång</span>
                  <p className="points-desc">Rätt vinnare eller oavgjort, men inte exakt resultat.</p>
                </div>
                <div className="points-card bonus">
                  <span className="points-value">+p</span>
                  <span className="points-label">Tilläggsfrågor</span>
                  <p className="points-desc">Rätt svar på tilläggsfrågor ger bonuspoäng — varje fråga har sitt eget värde.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="wine-section">
            <div className="wine-inner">
              <span className="wine-icon">🍷</span>
              <h2 className="wine-title">Vinpotten</h2>
              <p className="wine-desc">
                Varje deltagare satsar <span className="wine-highlight">en vinflaska</span> som läggs i potten.
                Vinnaren tar hem <span className="wine-highlight">hela samlingen</span> när VM är slut.
              </p>
              <div className="wine-steps">
                <div className="wine-step">
                  <span className="wine-step-num">1</span>
                  <p className="wine-step-text">Välj din vinflaska och lägg in en länk när du registrerar dig.</p>
                </div>
                <div className="wine-step">
                  <span className="wine-step-num">2</span>
                  <p className="wine-step-text">Alla deltagarnas flaskor visas öppet i vinpotten — se vad du konkurrerar om.</p>
                </div>
                <div className="wine-step">
                  <span className="wine-step-num">3</span>
                  <p className="wine-step-text">Den som toppar topplistan efter finalen den 19 juli vinner allt.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}