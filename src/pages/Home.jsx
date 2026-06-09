import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import MatchKort, { normName, MATCH_KORT_STYLES } from '../components/MatchKort'

const GRUPPSPEL_DEADLINE = new Date('2026-06-11T16:00:00+02:00')

const LANDING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@400;500&display=swap');

  .home-hero { min-height:calc(100svh - 60px); background:linear-gradient(160deg,#0a1628 0%,#0d2040 50%,#0a1628 100%); display:flex; align-items:center; padding:3rem 1.5rem 4rem; position:relative; overflow:hidden; }
  .home-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 70% 50% at 50% 30%,rgba(200,16,46,0.12) 0%,transparent 60%),radial-gradient(ellipse 50% 60% at 80% 80%,rgba(197,160,40,0.08) 0%,transparent 50%); pointer-events:none; }
  .hero-inner { max-width:680px; margin:0 auto; text-align:center; position:relative; z-index:1; }
  .hero-eyebrow { display:inline-flex; align-items:center; gap:8px; background:rgba(197,160,40,0.12); border:1px solid rgba(197,160,40,0.3); border-radius:100px; padding:6px 16px; font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:#F0D060; margin-bottom:1.5rem; }
  .hero-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(2.8rem,10vw,5.5rem); font-weight:700; line-height:0.95; letter-spacing:0.01em; color:#fff; margin-bottom:0.5rem; }
  .hero-title .accent { color:#C8102E; display:block; }
  .hero-subtitle { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1rem,3vw,1.3rem); font-weight:400; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.45); margin-bottom:2rem; }
  .hero-desc { font-family:'Barlow',sans-serif; font-size:1rem; color:rgba(255,255,255,0.6); line-height:1.7; max-width:480px; margin:0 auto 2.5rem; }
  .hero-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:3.5rem; }
  .btn-primary { display:inline-block; text-decoration:none; padding:14px 32px; border-radius:8px; background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; border:none; cursor:pointer; transition:opacity .2s,transform .2s; }
  .btn-primary:hover { opacity:.88; transform:translateY(-1px); }
  .btn-secondary { display:inline-block; text-decoration:none; padding:14px 28px; border-radius:8px; background:transparent; color:rgba(255,255,255,0.8); font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; border:1px solid rgba(255,255,255,0.25); cursor:pointer; transition:border-color .2s,color .2s; }
  .btn-secondary:hover { border-color:#F0D060; color:#F0D060; }
  .stats-row { display:flex; justify-content:center; border-top:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.08); padding:1.5rem 0; }
  .stat-item { flex:1; max-width:140px; text-align:center; padding:0 1rem; border-right:1px solid rgba(255,255,255,0.08); }
  .stat-item:last-child { border-right:none; }
  .stat-num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:700; color:#F0D060; line-height:1; display:block; }
  .stat-lbl { font-size:0.65rem; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-top:0.25rem; display:block; }
  .rek-info { font-family:'Barlow',sans-serif; font-size:0.82rem; color:rgba(255,255,255,0.6); margin-top:1.25rem; line-height:1.65; text-align:center; max-width:440px; margin-left:auto; margin-right:auto; background:rgba(197,160,40,0.08); border:1px solid rgba(197,160,40,0.2); border-radius:9px; padding:0.75rem 1rem; }
  .rek-info a { color:#F0D060; text-decoration:underline; }
  .goal-tracker { background:rgba(255,255,255,0.05); border:1px solid rgba(197,160,40,0.2); border-radius:12px; padding:1.25rem 1.5rem; margin:1.5rem auto 0; max-width:500px; text-align:center; }
  .goal-tracker-label { font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:0.5rem; }
  .goal-tracker-num { font-family:'Barlow Condensed',sans-serif; font-size:3rem; font-weight:700; color:#F0D060; line-height:1; display:block; margin-bottom:0.25rem; }
  .goal-tracker-sub { font-family:'Barlow',sans-serif; font-size:0.78rem; color:rgba(255,255,255,0.35); }
  .goal-tracker-sub strong { color:rgba(255,255,255,0.6); }
  .welcome-section { background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 100%); padding:3rem 1.5rem; text-align:center; }
  .welcome-inner { max-width:560px; margin:0 auto; }
  .welcome-name { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,5vw,2.5rem); font-weight:700; color:#F0D060; letter-spacing:0.03em; margin-bottom:0.5rem; }
  .welcome-sub { color:rgba(255,255,255,0.55); font-size:0.95rem; margin-bottom:2rem; }
  .quick-links { display:grid; grid-template-columns:repeat(2,1fr); gap:0.75rem; max-width:400px; margin:0 auto; }
  .quick-link { text-decoration:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:1rem; text-align:center; transition:background .2s,border-color .2s; }
  .quick-link:hover { background:rgba(197,160,40,0.1); border-color:rgba(197,160,40,0.3); }
  .quick-link-icon { font-size:1.5rem; display:block; margin-bottom:0.35rem; }
  .quick-link-label { font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.7); }
  .how-section { background:#f8f7f4; padding:4rem 1.5rem; }
  .how-inner { max-width:760px; margin:0 auto; }
  .section-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; color:#C8102E; margin-bottom:0.5rem; }
  .section-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:0.02em; margin-bottom:2.5rem; }
  .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
  .step-card { background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:12px; padding:1.5rem 1.25rem; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.04); position:relative; }
  .step-num { position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-family:'Barlow Condensed',sans-serif; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; background:#C8102E; color:#fff; border-radius:4px; padding:2px 8px; }
  .step-icon { font-size:2rem; display:block; margin:0.5rem 0 0.75rem; }
  .step-title { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#0a1628; letter-spacing:0.05em; margin-bottom:0.5rem; }
  .step-desc { font-family:'Barlow',sans-serif; font-size:0.85rem; color:#666; line-height:1.6; }
  @media (max-width:480px) { .stat-item { padding:0 0.6rem; } .stat-num { font-size:1.6rem; } .steps-grid { grid-template-columns:1fr; } .quick-links { grid-template-columns:repeat(2,1fr); } }
`

const DASHBOARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&display=swap');

  .dash-wrap { max-width:760px; margin:0 auto; padding:2rem 1rem 5rem; }
  .dash-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .dash-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.5rem; }

  .dash-stats { display:flex; gap:0; border:1px solid rgba(0,0,0,.07); border-radius:12px; overflow:hidden; margin-bottom:1.75rem; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .dash-stat { flex:1; text-align:center; padding:.875rem .5rem; border-right:1px solid rgba(0,0,0,.07); }
  .dash-stat:last-child { border-right:none; }
  .dash-stat-num { font-family:'Barlow Condensed',sans-serif; font-size:1.6rem; font-weight:700; color:#C5A028; line-height:1; display:block; }
  .dash-stat-lbl { font-size:.6rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#aaa; margin-top:3px; display:block; }

  .dash-section { margin-bottom:2rem; }
  .dash-section-header { display:flex; align-items:center; gap:10px; margin-bottom:.875rem; }
  .dash-section-pill { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; background:#0a1628; color:#F0D060; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .dash-section-pill.gold { background:linear-gradient(135deg,#C5A028,#a8881f); color:#fff; }
  .dash-section-line { flex:1; height:1px; background:rgba(0,0,0,.07); }
  .dash-see-all { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#C5A028; text-decoration:none; padding:4px 0; white-space:nowrap; }
  .dash-see-all:hover { color:#0a1628; }

  .lb-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .lb-row { display:flex; align-items:center; gap:10px; padding:.7rem 1rem; border-bottom:.5px solid rgba(0,0,0,.05); }
  .lb-row:last-child { border-bottom:none; }
  .lb-row.me { background:rgba(197,160,40,.05); }
  .lb-rank { width:22px; font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:700; color:#aaa; text-align:center; flex-shrink:0; }
  .lb-rank.top3 { color:#C5A028; }
  .lb-avatar { width:30px; height:30px; border-radius:50%; background:rgba(10,22,40,.08); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; color:#0a1628; flex-shrink:0; }
  .lb-avatar.me { background:rgba(197,160,40,.15); color:#7a5e10; }
  .lb-name { flex:1; font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .lb-pts { font-family:'Barlow Condensed',sans-serif; font-size:.95rem; font-weight:700; color:#0a1628; }
  .lb-pts-lbl { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; color:#aaa; margin-left:2px; }

  .dash-empty { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem 1rem; text-align:center; font-family:'Barlow',sans-serif; font-size:.88rem; color:#aaa; box-shadow:0 1px 3px rgba(0,0,0,.04); }

  ${MATCH_KORT_STYLES}
`

export default function Home() {
  const { användare } = useAuth()
  const { t }         = useLanguage()
  const [ticker, setTicker]       = useState(null)
  const [målData, setMålData]     = useState(null)
  const gruppspelLåst = new Date() >= GRUPPSPEL_DEADLINE

  // Dashboard state (post-lock only)
  const [matcher, setMatcher]       = useState([])
  const [minaTips, setMinaTips]     = useState({})
  const [matchStats, setMatchStats] = useState({})
  const [odds, setOdds]             = useState({})
  const [topplista, setTopplista]   = useState([])

  useEffect(() => {
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

    if (gruppspelLåst) {
      hämtaDashboard()
    }
  }, [användare])

  async function hämtaDashboard() {
    const [matcherRes, statsRes, oddsRes, scoreRes] = await Promise.allSettled([
      fetch('/.netlify/functions/matches').then(r => r.json()),
      fetch('/.netlify/functions/match-stats').then(r => r.json()),
      fetch('/.netlify/functions/odds').then(r => r.json()),
      fetch('/.netlify/functions/scores').then(r => r.json()),
    ])

    if (matcherRes.status === 'fulfilled') setMatcher(Array.isArray(matcherRes.value) ? matcherRes.value : [])
    if (statsRes.status === 'fulfilled' && !statsRes.value?.error) setMatchStats(statsRes.value || {})
    if (oddsRes.status === 'fulfilled' && oddsRes.value?.odds) {
      const lookup = {}
      oddsRes.value.odds.forEach(o => {
        const key = normName(o.home_team) + '_' + normName(o.away_team)
        lookup[key] = o
      })
      setOdds(lookup)
    }
    if (scoreRes.status === 'fulfilled' && Array.isArray(scoreRes.value)) {
      setTopplista(scoreRes.value.slice(0, 7))
    }

    if (användare) {
      fetch(`/.netlify/functions/tips?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${användare.token}` },
      }).then(r => r.json()).then(data => {
        const map = {}
        data.forEach(tip => { map[tip.match_id] = tip })
        setMinaTips(map)
      }).catch(() => {})
    }
  }

  function oddsForMatch(match) {
    const key = normName(match.hemmalag) + '_' + normName(match.bortalag)
    return odds[key] || null
  }

  // ── Landing page (before lock) ──────────────────────────────────────────
  if (!gruppspelLåst) {
    return (
      <>
        <style>{LANDING_STYLES}</style>

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

  // ── Post-lock dashboard ─────────────────────────────────────────────────
  const idag = new Date().toISOString().slice(0, 10)
  const dagensMatcherRaw = matcher.filter(m => m.datum === idag)

  // Separate into ongoing (no result yet) and finished (has result)
  const dagensMatcherPågående = dagensMatcherRaw.filter(m => !matchStats[m.match_id]?.resultat_hemma !== undefined
    ? true
    : matchStats[m.match_id] === undefined
  )
  // Simpler: split by whether result exists
  const harResultat = (m) => matchStats[m.match_id] && matchStats[m.match_id].resultat_hemma !== undefined
  const speladaIdag = dagensMatcherRaw.filter(m => harResultat(m))
  const kommande    = dagensMatcherRaw.filter(m => !harResultat(m))

  const minRank = användare && topplista.length > 0
    ? topplista.findIndex(r => r.user_id === användare.user_id)
    : -1

  function initials(namn) {
    return (namn || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>
      <div className="dash-wrap">

        <p className="dash-eyebrow">VM-tipsen 2026</p>
        <h1 className="dash-title">
          {användare ? `Hej, ${användare.namn.split(' ')[0]}! 👋` : 'Hur går det? ⚽'}
        </h1>

        {/* ── Stats strip ── */}
        <div className="dash-stats">
          {målData?.totalMål > 0 && (
            <div className="dash-stat">
              <span className="dash-stat-num">{målData.totalMål}</span>
              <span className="dash-stat-lbl">Mål totalt</span>
            </div>
          )}
          {målData?.speladeMatcher > 0 && (
            <div className="dash-stat">
              <span className="dash-stat-num">{målData.speladeMatcher}</span>
              <span className="dash-stat-lbl">Matcher spelat</span>
            </div>
          )}
          {målData?.snitMålPerMatch > 0 && (
            <div className="dash-stat">
              <span className="dash-stat-num">{målData.snitMålPerMatch}</span>
              <span className="dash-stat-lbl">Mål/match</span>
            </div>
          )}
          {ticker?.antalDeltagare > 0 && (
            <div className="dash-stat">
              <span className="dash-stat-num">{ticker.antalDeltagare}</span>
              <span className="dash-stat-lbl">Deltagare</span>
            </div>
          )}
          {ticker?.pottVärde > 0 && (
            <div className="dash-stat">
              <span className="dash-stat-num">{ticker.pottVärde} kr</span>
              <span className="dash-stat-lbl">Vinpotten</span>
            </div>
          )}
        </div>

        {/* ── Today's ongoing matches ── */}
        {kommande.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">🔴 Pågår idag</span>
              <div className="dash-section-line" />
              <Link to="/matches" className="dash-see-all">Alla matcher →</Link>
            </div>
            {kommande.map(match => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                tipsLåst={true}
                sparar={false}
                onSpara={() => {}}
                odds={oddsForMatch(match)}
                stats={matchStats[match.match_id] || null}
              />
            ))}
          </div>
        )}

        {/* ── Today's finished matches ── */}
        {speladaIdag.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">✅ Klara idag</span>
              <div className="dash-section-line" />
            </div>
            {speladaIdag.map(match => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                tipsLåst={true}
                sparar={false}
                onSpara={() => {}}
                odds={oddsForMatch(match)}
                stats={matchStats[match.match_id] || null}
              />
            ))}
          </div>
        )}

        {/* ── No games today ── */}
        {dagensMatcherRaw.length === 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">📅 Idag</span>
              <div className="dash-section-line" />
              <Link to="/matches" className="dash-see-all">Alla matcher →</Link>
            </div>
            <div className="dash-empty">Inga matcher spelas idag.</div>
          </div>
        )}

        {/* ── Leaderboard top 7 ── */}
        <div className="dash-section">
          <div className="dash-section-header">
            <span className="dash-section-pill gold">🏆 Topplistan</span>
            <div className="dash-section-line" />
            <Link to="/leaderboard" className="dash-see-all">Se alla →</Link>
          </div>
          {topplista.length === 0 ? (
            <div className="dash-empty">Laddar topplista…</div>
          ) : (
            <div className="lb-card">
              {topplista.map((rad, i) => {
                const ärJag = användare && rad.user_id === användare.user_id
                return (
                  <div key={rad.user_id} className={`lb-row${ärJag ? ' me' : ''}`}>
                    <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
                    <div className={`lb-avatar${ärJag ? ' me' : ''}`}>{initials(rad.namn)}</div>
                    <span className="lb-name">{rad.namn}{ärJag ? ' (du)' : ''}</span>
                    <span className="lb-pts">{rad.poäng}<span className="lb-pts-lbl"> p</span></span>
                  </div>
                )
              })}
              {/* Show user's position if outside top 7 */}
              {användare && minRank >= 7 && (
                <>
                  <div className="lb-row" style={{ justifyContent:'center', padding:'.4rem', color:'#ccc', fontSize:'.75rem' }}>· · ·</div>
                  <div className="lb-row me">
                    <span className="lb-rank">{minRank + 1}</span>
                    <div className="lb-avatar me">{initials(användare.namn)}</div>
                    <span className="lb-name">{användare.namn} (du)</span>
                    <span className="lb-pts">{topplista[minRank]?.poäng ?? '—'}<span className="lb-pts-lbl"> p</span></span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
