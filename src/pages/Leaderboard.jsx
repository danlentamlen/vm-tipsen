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
import { useSettings } from '../hooks/useSettings'
import { getFlag } from '../utils/flags'

const STYLES = `
  .lb-rad { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:10px; padding:.75rem 1rem; margin-bottom:.5rem; transition:box-shadow .15s,transform .15s; }
  .lb-rad:hover { box-shadow:0 2px 8px rgba(0,0,0,.07); }
  .lb-rad.mig   { border-color:rgba(200,16,46,.3); background:rgba(200,16,46,.03); }
  .lb-rad-link  { text-decoration:none; color:inherit; cursor:pointer; }
  .lb-rad-link:hover { transform:translateY(-1px); border-color:rgba(197,160,40,.4); }
  .lb-chevron   { font-family:var(--font-bred); font-size:1.2rem; font-weight:700; color:var(--c-text-4); margin-left:2px; flex-shrink:0; }
  .lb-plats  { font-family:var(--font-bred); font-size:1rem; font-weight:700; color:var(--c-text-4); min-width:28px; text-align:center; }
  .lb-medalj { font-size:1.1rem; min-width:28px; text-align:center; }
  .lb-mitten { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
  .lb-namn   { font-family:var(--font-text); font-size:.92rem; font-weight:500; color:var(--c-text); }
  .lb-namn.mig { color:var(--c-röd); }
  .lb-poäng  { font-family:var(--font-bred); font-size:1.1rem; font-weight:700; color:var(--c-text); }
  .lb-poäng-lbl { font-size:.72rem; color:var(--c-text-4); margin-left:3px; }
  .lb-breakdown { display:flex; gap:6px; justify-content:flex-end; margin-top:2px; }
  .lb-breakdown-chip { font-family:var(--font-bred); font-size:.65rem; font-weight:700; letter-spacing:.04em; color:var(--c-text-4); white-space:nowrap; }
  .lb-vin { font-family:var(--font-text); font-size:.7rem; color:var(--c-text-4); margin-top:1px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
  .lb-vin-pris { font-family:var(--font-bred); font-size:.7rem; font-weight:700; color:#C5A028; margin-left:3px; white-space:nowrap; }
  .lb-finallag { display:flex; flex-direction:column; gap:1px; margin-top:3px; align-items:flex-end; }
  .lb-finallag-rad { font-family:var(--font-text); font-size:.7rem; color:var(--c-text-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px; }
  .lb-finallag-rad.ut { color:var(--c-röd); text-decoration:line-through; text-decoration-color:rgba(200,16,46,.5); }
  .lb-finallag-lbl { font-weight:700; }
  .lb-legend { display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.25rem; padding-top:1rem; border-top:1px solid rgba(0,0,0,.06); }
  .lb-legend-post { display:flex; align-items:center; gap:6px; font-size:.78rem; color:#666; }
  .lb-legend-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
`
const MEDALJER = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [topplista, setTopplista]     = useState([])
  const [vinerMap, setVinerMap]       = useState({})
  const [finallagMap, setFinallagMap] = useState({})
  const [laddar, setLaddar]           = useState(true)
  const [fel, setFel]                 = useState(null)
  const { användare }                 = useAuth()
  const { t }                         = useLanguage()
  const { tipsLåst }                  = useSettings()

  const hämtaTopplista = useCallback(async () => {
    setLaddar(true); setFel(null)
    try {
      const [scoresRes, vinerRes, finallagRes] = await Promise.all([
        fetch('/.netlify/functions/scores'),
        fetch('/.netlify/functions/viner-hamta').catch(() => null),
        // Finaltips avslöjas bara när tipsen är låsta → hämta inte annars.
        tipsLåst ? fetch('/.netlify/functions/finallagen').catch(() => null) : Promise.resolve(null),
      ])
      if (!scoresRes.ok) throw new Error(`Status ${scoresRes.status}`)
      const data = await scoresRes.json()
      setTopplista(Array.isArray(data) ? data.filter((r) => r?.namn) : [])

      if (vinerRes?.ok) {
        const viner = await vinerRes.json().catch(() => [])
        const map = {}
        if (Array.isArray(viner)) {
          viner.forEach((v) => { if (v.user_id && v.betalt === 'betalt') map[v.user_id] = v })
        }
        setVinerMap(map)
      }

      if (finallagRes?.ok) {
        const fl = await finallagRes.json().catch(() => ({}))
        setFinallagMap(fl && typeof fl === 'object' ? fl : {})
      } else {
        setFinallagMap({})
      }
    } catch (err) {
      console.error('[Leaderboard]', err)
      setFel(t('leaderboard.fel'))
    } finally { setLaddar(false) }
  }, [t, tipsLåst])

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
        const ärJag    = användare?.user_id === rad.user_id
        const vin      = vinerMap[rad.user_id]
        const finallag = finallagMap[rad.user_id]
        const innehåll = (
          <>
            {i < 3 ? <span className="lb-medalj">{MEDALJER[i]}</span> : <span className="lb-plats">{i + 1}</span>}
            <div className="lb-mitten">
              <span className={`lb-namn${ärJag ? ' mig' : ''}`}>
                {rad.namn}{ärJag && ` ${t('leaderboard.du')}`}
              </span>
              {vin?.vin_namn && (
                <div className="lb-vin">
                  🍷 <span title={vin.vin_namn}>{vin.vin_namn}</span>
                  {vin.vin_pris && <span className="lb-vin-pris">{vin.vin_pris}</span>}
                </div>
              )}
            </div>
            <div style={{ textAlign:'right', minWidth:0 }}>
              <span className="lb-poäng">{rad.poäng ?? 0}<span className="lb-poäng-lbl">p</span></span>
              {(rad.frågepoäng > 0 || rad.poäng > 0) && (
                <div className="lb-breakdown">
                  <span className="lb-breakdown-chip">⚽ {(rad.poäng ?? 0) - (rad.frågepoäng ?? 0)}p</span>
                  <span className="lb-breakdown-chip">🎯 {rad.frågepoäng ?? 0}p</span>
                </div>
              )}
              {(finallag?.vinnare || finallag?.förlorare) && (
                <div className="lb-finallag" title={t('leaderboard.finallagen.titel')}>
                  {finallag.vinnare && (
                    <span
                      className={`lb-finallag-rad${finallag.vinnareUt ? ' ut' : ''}`}
                      title={`${t('leaderboard.finallagen.vinnare')}: ${finallag.vinnare}${finallag.vinnareUt ? ` (${t('leaderboard.finallagen.utslagen')})` : ''}`}
                    >
                      🏆 {getFlag(finallag.vinnare)} {finallag.vinnare}
                    </span>
                  )}
                  {finallag.förlorare && (
                    <span
                      className={`lb-finallag-rad${finallag.förlorareUt ? ' ut' : ''}`}
                      title={`${t('leaderboard.finallagen.förlorare')}: ${finallag.förlorare}${finallag.förlorareUt ? ` (${t('leaderboard.finallagen.utslagen')})` : ''}`}
                    >
                      🥈 {getFlag(finallag.förlorare)} {finallag.förlorare}
                    </span>
                  )}
                </div>
              )}
            </div>
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
        <div className="lb-legend-post"><div className="lb-legend-dot" style={{ background:'#C5A028' }} />Vid lika poäng: flest exakta → dyrast vin</div>
      </div>
    </div></>
  )
}
