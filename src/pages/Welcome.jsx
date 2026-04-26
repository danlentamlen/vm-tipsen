import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .wlc-page {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem;
    position: relative; overflow: hidden;
  }
  .wlc-page::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 30%, rgba(197,160,40,0.1) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 70%, rgba(200,16,46,0.08) 0%, transparent 55%);
  }

  .wlc-card {
    width: 100%; max-width: 480px;
    background: #fff; border-radius: 16px;
    padding: 2.5rem 2rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    position: relative; z-index: 1;
    text-align: center;
  }

  .wlc-icon {
    font-size: 3.5rem; display: block; margin-bottom: 1.25rem;
    animation: wlc-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes wlc-pop {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  .wlc-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.4rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1;
    margin-bottom: 0.5rem;
  }
  .wlc-name { color: #C8102E; }
  .wlc-sub {
    font-family: 'Barlow', sans-serif;
    font-size: 0.95rem; color: #777; line-height: 1.6;
    margin-bottom: 2rem; max-width: 360px; margin-left: auto; margin-right: auto;
  }

  /* Steps */
  .wlc-steps {
    display: flex; flex-direction: column; gap: 0.625rem;
    margin-bottom: 2rem; text-align: left;
  }
  .wlc-step {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 0.875rem 1rem;
    border-radius: 10px; border: 1px solid rgba(0,0,0,0.07);
    background: #fafaf8;
    transition: border-color 0.15s;
  }
  .wlc-step.done { background: rgba(197,160,40,0.05); border-color: rgba(197,160,40,0.3); }
  .wlc-step-icon { font-size: 1.25rem; flex-shrink: 0; margin-top: 1px; }
  .wlc-step-body {}
  .wlc-step-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.85rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; margin-bottom: 2px;
  }
  .wlc-step.done .wlc-step-title { color: #8a6e1a; }
  .wlc-step:not(.done) .wlc-step-title { color: #0a1628; }
  .wlc-step-desc {
    font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; color: #888; line-height: 1.5;
  }

  .wlc-btn {
    display: block; text-decoration: none; width: 100%;
    padding: 14px; border-radius: 10px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    margin-bottom: 0.75rem;
  }
  .wlc-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  .wlc-skip {
    font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; color: #bbb; text-decoration: none;
    display: block; transition: color 0.15s;
  }
  .wlc-skip:hover { color: #888; }
`

export default function Welcome() {
  const { användare } = useAuth()
  const namn = användare?.namn?.split(' ')[0] || 'där'

  return (
    <>
      <style>{STYLES}</style>
      <div className="wlc-page">
        <div className="wlc-card">
          <span className="wlc-icon">🎉</span>
          <h1 className="wlc-title">
            Välkommen, <span className="wlc-name">{namn}!</span>
          </h1>
          <p className="wlc-sub">
            Ditt konto är skapat. Nu är du med i VM-tipsen 2026 — ett steg kvar innan du är redo!
          </p>

          <div className="wlc-steps">
            <div className="wlc-step done">
              <span className="wlc-step-icon">✅</span>
              <div className="wlc-step-body">
                <p className="wlc-step-title">Konto skapat</p>
                <p className="wlc-step-desc">Du är registrerad och inloggad.</p>
              </div>
            </div>
            <div className="wlc-step">
              <span className="wlc-step-icon">🍷</span>
              <div className="wlc-step-body">
                <p className="wlc-step-title">Välj din vinflaska</p>
                <p className="wlc-step-desc">Välj en flaska mellan 180–220 kr och swisha insatsen + 10 kr i adminavgift.</p>
              </div>
            </div>
            <div className="wlc-step">
              <span className="wlc-step-icon">⚽</span>
              <div className="wlc-step-body">
                <p className="wlc-step-title">Lämna dina tips</p>
                <p className="wlc-step-desc">Tippa alla 104 matcher och svara på tilläggsfrågor innan VM startar.</p>
              </div>
            </div>
          </div>

          <Link to="/mitt-vin" className="wlc-btn">
            Välj din vinflaska →
          </Link>
          <Link to="/matches" className="wlc-skip">
            Hoppa över, tippa matcher nu
          </Link>
        </div>
      </div>
    </>
  )
}