/**
 * Leaderboard.jsx — Exempel på i18n-migrering
 *
 * Alla synliga strängar är utbytta mot t()-anrop.
 * Samma mönster används för alla andra sidor.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const STYLES = `
  .lb-rad { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:10px; padding:.75rem 1rem; margin-bottom:.5rem; transition:box-shadow .15s,transform .15s; }
  .lb-rad:hover { box-shadow:0 2px 8px rgba(0,0,0,.07); }
  .lb-rad.mig   { border-color:rgba(200,16,46,.3); background:rgba(200,16,46,.03); }
  .lb-rad-link  { text-decoration:none; color:inherit; cursor:pointer; }
  .lb-rad-link:hover { transform:translateY(-1px); border-color:rgba(197,160,40,.4); }
  .lb-chevron   { font-family:var(--font-bred); font-size:1.2rem; font-weight:700; color:var(--c-text-4); margin-left:2px; flex-shrink:0; }
  .lb-plats  { font-family:var(--font-bred); font-size:1rem; font-weight:700; color:var(--c-text-4); min-width:28px; text-align:center; }
  .lb-medalj { font-size:1.1rem; min-width:28px; text-align:center; }
  .lb-namn   { font-family:var(--font-text); font-size:.92rem; font-weight:500; color:var(--c-text); flex:1; }
  .lb-namn.mig { color:var(--c-röd); }
  .lb-poäng  { font-family:var(--font-bred); font-size:1.1rem; font-weight:700; color:var(--c-text); }
  .lb-poäng-lbl { font-size:.72rem; color:var(--c-text-4); margin-left:3px; }
  .lb-legend { display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.25rem; padding-top:1rem; border-top:1px solid rgba(0,0,0,.06); }
  .lb-legend-post { display:flex; align-items:center; gap:6px; font-size:.78rem; color:#666; }
  .lb-legend-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
`
const MEDALJER = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [topplista, setTopplista] = useState([])
  const [laddar, setLaddar]       = useState(true)
  const [fel, setFel]             = useState(null)
  const { användare }             = useAuth()
  const { t }                     = useLanguage()   // ← NY

  const hämtaTopplista = useCallback(async () => {
    setLaddar(true); setFel(null)
    try {
      const res = await fetch('/.netlify/functions/scores')
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setTopplista(Array.isArray(data) ? data.filter((r) => r?.namn) : [])
    } catch (err) {
      console.error('[Leaderboard]', err)
      setFel(t('leaderboard.fel'))
    } finally { setLaddar(false) }
  }, [t])

  useEffect(() => { hämtaTopplista() }, [hämtaTopplista])

  if (laddar) return (
    <div style={{ textAlign:'center', padding:'4rem 1rem', color:'var(--c-text-3)' }}>
      {t('leaderboard.laddar')}
    </div>
  )

  if (fel) return (
    <><style>{STYLES}</style>
    <div className="page-wrap">
      <div className="fel-banner">
        <p style={{ margin:0 }}>{fel}</p>
        <button className="btn btn-primär" style={{ marginTop:'.75rem' }} onClick={hämtaTopplista}>
          {t('leaderboard.försökIgen')}
        </button>
      </div>
    </div></>
  )

  if (topplista.length === 0) return (
    <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
      <p style={{ fontSize:'3rem', marginBottom:'1rem' }}>⏳</p>
      <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--c-mörk)', marginBottom:'.5rem' }}>
        {t('leaderboard.ingenData.titel')}
      </h2>
      <p style={{ color:'var(--c-text-3)' }}>{t('leaderboard.ingenData.beskrivning')}</p>
    </div>
  )

  return (
    <><style>{STYLES}</style>
    <div className="page-wrap">
      <p className="eyebrow">{t('leaderboard.eyebrow')}</p>
      <h2 className="page-title">{t('leaderboard.titel')}</h2>

      {topplista.map((rad, i) => {
        const ärJag = användare?.user_id === rad.user_id
        const innehåll = (
          <>
            {i < 3 ? <span className="lb-medalj">{MEDALJER[i]}</span> : <span className="lb-plats">{i + 1}</span>}
            <span className={`lb-namn${ärJag ? ' mig' : ''}`}>
              {rad.namn}{ärJag && ` ${t('leaderboard.du')}`}
            </span>
            <span className="lb-poäng">{rad.poäng ?? 0}<span className="lb-poäng-lbl">p</span></span>
          </>
        )
        // Klickbar rad → deltagarens sida med tipsen. Faller tillbaka till en
        // ren rad om user_id mot förmodan saknas (inget trasigt klick).
        return rad.user_id ? (
          <Link
            key={rad.user_id}
            to={`/participant/${rad.user_id}`}
            className={`lb-rad lb-rad-link${ärJag ? ' mig' : ''}`}
            aria-label={`Visa ${rad.namn}s tips`}
          >
            {innehåll}
            <span className="lb-chevron" aria-hidden="true">›</span>
          </Link>
        ) : (
          <div key={i} className={`lb-rad${ärJag ? ' mig' : ''}`}>{innehåll}</div>
        )
      })}

      <div className="lb-legend">
        <div className="lb-legend-post"><div className="lb-legend-dot" style={{ background:'#C8102E' }} />{t('leaderboard.legend.exakt')}</div>
        <div className="lb-legend-post"><div className="lb-legend-dot" style={{ background:'#1a2e4a' }} />{t('leaderboard.legend.rätt')}</div>
        <div className="lb-legend-post"><div className="lb-legend-dot" style={{ background:'#C5A028' }} />{t('leaderboard.legend.bonus')}</div>
      </div>
    </div></>
  )
}
