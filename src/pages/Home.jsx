import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@400;500&display=swap');

  .home-hero {
    min-height: calc(100svh - 60px);
    background: linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #0a1628 100%);
    display: flex; align-items: center;
    padding: 3rem 1.5rem 4rem;
    position: relative; overflow: hidden;
  }
  .home-hero::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 50% 30%, rgba(200,16,46,0.12) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 80%, rgba(197,160,40,0.08) 0%, transparent 50%);
    pointer-events: none;
  }
  .hero-inner { max-width: 680px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(197,160,40,0.12); border: 1px solid rgba(197,160,40,0.3);
    border-radius: 100px; padding: 6px 16px;
    font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem;
    font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #F0D060;
    margin-bottom: 1.5rem;
  }
  .hero-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(2.8rem, 10vw, 5.5rem); font-weight: 700;
    line-height: 0.95; letter-spacing: 0.01em; color: #fff; margin-bottom: 0.5rem;
  }
  .hero-title .accent { color: #C8102E; display: block; }
  .hero-subtitle {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1rem, 3vw, 1.3rem); font-weight: 400;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.45); margin-bottom: 2rem;
  }
  .hero-desc {
    font-family: 'Barlow', sans-serif; font-size: 1rem;
    color: rgba(255,255,255,0.6); line-height: 1.7;
    max-width: 480px; margin: 0 auto 2.5rem;
  }
  .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 3.5rem; }
  .btn-primary {
    display: inline-block; text-decoration: none; padding: 14px 32px; border-radius: 8px;
    background: linear-gradient(135deg, #C8102E, #e01535); color: #fff;
    font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; border: none; cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
  }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-secondary {
    display: inline-block; text-decoration: none; padding: 14px 28px; border-radius: 8px;
    background: transparent; color: rgba(255,255,255,0.8);
    font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.25); cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-secondary:hover { border-color: #F0D060; color: #F0D060; }
  .stats-row {
    display: flex; justify-content: center;
    border-top: 1px solid rgba(255,255,255,0.08);
    border-bottom: 1px solid rgba(255,255,255,0.08); padding: 1.5rem 0;
  }
  .stat-item { flex: 1; max-width: 140px; text-align: center; padding: 0 1rem; border-right: 1px solid rgba(255,255,255,0.08); }
  .stat-item:last-child { border-right: none; }
  .stat-num { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 700; color: #F0D060; line-height: 1; display: block; }
  .stat-lbl { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 0.25rem; display: block; }
  .rek-info {
    font-family: 'Barlow', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.6);
    margin-top: 1.25rem; line-height: 1.65; text-align: center;
    max-width: 440px; margin-left: auto; margin-right: auto;
    background: rgba(197,160,40,0.08); border: 1px solid rgba(197,160,40,0.2);
    border-radius: 9px; padding: 0.75rem 1rem;
  }
  .rek-info a { color: #F0D060; text-decoration: underline; }
  .rek-info a:hover { color: #fff; }
  .goal-tracker {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(197,160,40,0.2);
    border-radius: 12px; padding: 1.25rem 1.5rem;
    margin: 1.5rem auto 0; max-width: 500px; text-align: center;
  }
  .goal-tracker-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 0.5rem; }
  .goal-tracker-num { font-family: 'Barlow Condensed', sans-serif; font-size: 3rem; font-weight: 700; color: #F0D060; line-height: 1; display: block; margin-bottom: 0.25rem; }
  .goal-tracker-sub { font-family: 'Barlow', sans-serif; font-size: 0.78rem; color: rgba(255,255,255,0.35); }
  .goal-tracker-sub strong { color: rgba(255,255,255,0.6); }
  .welcome-section { background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%); padding: 3rem 1.5rem; text-align: center; }
  .welcome-inner { max-width: 560px; margin: 0 auto; }
  .welcome-name { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(1.8rem, 5vw, 2.5rem); font-weight: 700; color: #F0D060; letter-spacing: 0.03em; margin-bottom: 0.5rem; }
  .welcome-sub { color: rgba(255,255,255,0.55); font-size: 0.95rem; margin-bottom: 2rem; }
  .quick-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; max-width: 400px; margin: 0 auto; }
  .quick-link { text-decoration: none; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 1rem; text-align: center; transition: background 0.2s, border-color 0.2s; }
  .quick-link:hover { background: rgba(197,160,40,0.1); border-color: rgba(197,160,40,0.3); }
  .quick-link-icon { font-size: 1.5rem; display: block; margin-bottom: 0.35rem; }
  .quick-link-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.7); }
  .how-section { background: #f8f7f4; padding: 4rem 1.5rem; }
  .how-inner { max-width: 760px; margin: 0 auto; }
  .section-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #C8102E; margin-bottom: 0.5rem; }
  .section-title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(1.8rem, 5vw, 2.8rem); font-weight: 700; color: #0a1628; letter-spacing: 0.02em; margin-bottom: 2.5rem; }
  .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .step-card { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; padding: 1.5rem 1.25rem; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.04); position: relative; }
  .step-num { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; background: #C8102E; color: #fff; border-radius: 4px; padding: 2px 8px; }
  .step-icon { font-size: 2rem; display: block; margin: 0.5rem 0 0.75rem; }
  .step-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; color: #0a1628; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .step-desc { font-family: 'Barlow', sans-serif; font-size: 0.85rem; color: #666; line-height: 1.6; }
  @media (max-width: 480px) { .stat-item { padding: 0 0.6rem; } .stat-num { font-size: 1.6rem; } .steps-grid { grid-template-columns: 1fr; } .quick-links { grid-template-columns: repeat(2, 1fr); } }
`

export default function Home() {
  const { användare } = useAuth()
  const { t }         = useLanguage()
  const [ticker, setTicker]   = useState(null)
  const [målData, setMålData] = useState(null)

  useEffect(() => {
    // Samma datahämtning som originalet — ingen ticker-funktion behövs
    Promise.all([
      fetch('/.netlify/functions/participants').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/viner-hamta').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/total-mal').then(r => r.json()).catch(() => null),
    ]).then(([deltagare, viner, malData]) => {
      const antalDeltagare = Array.isArray(deltagare) ? deltagare.length : 0
      const betalda  = Array.isArray(viner) ? viner.filter(v => v.betalt === 'betalt') : []
      const pottVärde = betalda.reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)
      setTicker({ antalDeltagare, antalBetalda: betalda.length, pottVärde })
      if (malData) setMålData(malData)
    })
  }, [])

  return (
    <>
      <style>{STYLES}</style>

      <div className="home-hero">
        <div className="hero-inner">
          <div className="hero-eyebrow"><span>⚽</span>{t('home.eyebrow')}</div>
          <h1 className="hero-title">
            {t('home.titel')}<span className="accent">2026</span>
          </h1>
          <p className="hero-subtitle">{t('home.subtitle')}</p>
          <p className="hero-desc">{t('home.beskrivning')}</p>

          {målData?.totalMål > 0 && (
            <div className="goal-tracker">
              <p className="goal-tracker-label">{t('home.målTracker.etikett')}</p>
              <span className="goal-tracker-num">{målData.totalMål}</span>
              <p className="goal-tracker-sub">
                {t('home.målTracker.på')} {målData.speladeMatcher} {t('home.målTracker.matcher')}
                {målData.snitMålPerMatch > 0 && (
                  <> · {t('home.målTracker.snitt')} <strong>{målData.snitMålPerMatch}</strong> {t('home.målTracker.målPerMatch')}</>
                )}
              </p>
            </div>
          )}

          <div className="hero-actions">
            {!användare ? (
              <>
                <Link to="/register" className="btn-primary">{t('home.anmälDig')}</Link>
                <Link to="/login" className="btn-secondary">{t('home.loggaIn')}</Link>
              </>
            ) : (
              <>
                <Link to="/matches" className="btn-primary">{t('home.lämnaKlick')}</Link>
                <Link to="/leaderboard" className="btn-secondary">{t('home.seTopplistan')}</Link>
              </>
            )}
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-num">{ticker?.antalDeltagare ?? '—'}</span>
              <span className="stat-lbl">{t('home.stats.deltagare')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{ticker?.antalBetalda ?? '—'}</span>
              <span className="stat-lbl">{t('home.stats.betalda')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{ticker?.pottVärde > 0 ? `${ticker.pottVärde} kr` : '—'}</span>
              <span className="stat-lbl">{t('home.stats.vinvärde')}</span>
            </div>
          </div>

          <p className="rek-info">
            🍷 <strong style={{ color:'#F0D060' }}>{t('home.rekrytering.rubrik')}</strong>{' '}
            {t('home.rekrytering.text')}{' '}
            <Link to="/mitt-vin">{t('home.rekrytering.länkText')}</Link>.
          </p>
        </div>
      </div>

      {användare && (
        <div className="welcome-section">
          <div className="welcome-inner">
            <p className="welcome-name">{t('home.välkommen', { namn: användare.namn })}</p>
            <p className="welcome-sub">{t('home.vadVillDu')}</p>
            <div className="quick-links">
              <Link to="/matches" className="quick-link">
                <span className="quick-link-icon">📅</span>
                <span className="quick-link-label">{t('home.quickLinks.matcher')}</span>
              </Link>
              <Link to="/leaderboard" className="quick-link">
                <span className="quick-link-icon">🏆</span>
                <span className="quick-link-label">{t('home.quickLinks.topplista')}</span>
              </Link>
              <Link to="/questions" className="quick-link">
                <span className="quick-link-icon">🎯</span>
                <span className="quick-link-label">{t('home.quickLinks.tilläggsfrågor')}</span>
              </Link>
              <Link to="/mitt-vin" className="quick-link">
                <span className="quick-link-icon">🍾</span>
                <span className="quick-link-label">{t('home.quickLinks.minVinflaska')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!användare && (
        <div className="how-section">
          <div className="how-inner">
            <p className="section-eyebrow">{t('home.såFunkar.eyebrow')}</p>
            <h2 className="section-title">{t('home.såFunkar.titel')}</h2>
            <div className="steps-grid">
              {t('home.såFunkar.steg').map((steg, i) => (
                <div key={i} className="step-card">
                  <span className="step-num">{i + 1}</span>
                  <span className="step-icon">{steg.ikon}</span>
                  <div className="step-title">{steg.titel}</div>
                  <p className="step-desc">{steg.beskr}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
