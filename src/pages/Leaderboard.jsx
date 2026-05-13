/**
 * Leaderboard.jsx — Refaktorerad styling
 *
 * ÄNDRAT (styling):
 *   - Tar bort <style>{`...`}</style>-blocket (130 rader CSS inline)
 *   - Använder .page-wrap, .eyebrow, .page-title, .fel-banner, .btn
 *     från tokens.css istället
 *   - Komponentspecifika stilar ligger kvar — men nu ~30 rader, inte 130
 *
 * ÄNDRAT (kvalitet):
 *   - Felhantering med retry-knapp
 *   - Markering av inloggad användares rad "(du)"
 *   - Defensiv dataparsning
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  .lb-rad { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:10px; padding:.75rem 1rem; margin-bottom:.5rem; transition:box-shadow .15s; }
  .lb-rad:hover { box-shadow:0 2px 8px rgba(0,0,0,.07); }
  .lb-rad.mig   { border-color:rgba(200,16,46,.3); background:rgba(200,16,46,.03); }
  .lb-plats  { font-family:var(--font-bred); font-size:1rem; font-weight:700; color:var(--c-text-4); min-width:28px; text-align:center; }
  .lb-medalj { font-size:1.1rem; min-width:28px; text-align:center; }
  .lb-namn   { font-family:var(--font-text); font-size:.92rem; font-weight:500; color:var(--c-text); flex:1; }
  .lb-namn.mig { color:var(--c-röd); }
  .lb-poäng  { font-family:var(--font-bred); font-size:1.1rem; font-weight:700; color:var(--c-text); }
  .lb-poäng-lbl { font-size:.72rem; color:var(--c-text-4); margin-left:3px; }
`
const MEDALJER = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [topplista, setTopplista] = useState([])
  const [laddar, setLaddar]       = useState(true)
  const [fel, setFel]             = useState(null)
  const { användare }             = useAuth()

  const hämtaTopplista = useCallback(async () => {
    setLaddar(true); setFel(null)
    try {
      const res = await fetch('/.netlify/functions/scores')
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setTopplista(Array.isArray(data) ? data.filter((r) => r?.namn) : [])
    } catch (err) {
      console.error('[Leaderboard]', err)
      setFel('Kunde inte hämta topplistan. Kontrollera din anslutning och försök igen.')
    } finally { setLaddar(false) }
  }, [])

  useEffect(() => { hämtaTopplista() }, [hämtaTopplista])

  if (laddar) return <div style={{ textAlign:'center', padding:'4rem 1rem', color:'var(--c-text-3)' }}>Laddar topplista...</div>

  if (fel) return (
    <><style>{STYLES}</style>
    <div className="page-wrap">
      <div className="fel-banner">
        <p style={{ margin:0 }}>{fel}</p>
        <button className="btn btn-primär" style={{ marginTop:'.75rem' }} onClick={hämtaTopplista}>Försök igen</button>
      </div>
    </div></>
  )

  if (topplista.length === 0) return (
    <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
      <p style={{ fontSize:'3rem', marginBottom:'1rem' }}>⏳</p>
      <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--c-mörk)', marginBottom:'.5rem' }}>Inga resultat än</h2>
      <p style={{ color:'var(--c-text-3)' }}>Topplistan uppdateras när matchresultat matas in.</p>
    </div>
  )

  return (
    <><style>{STYLES}</style>
    <div className="page-wrap">
      <p className="eyebrow">VM-tipsen 2026</p>
      <h2 className="page-title">Topplista</h2>
      {topplista.map((rad, i) => {
        const ärJag = användare?.user_id === rad.user_id
        return (
          <div key={rad.user_id ?? i} className={`lb-rad${ärJag ? ' mig' : ''}`}>
            {i < 3 ? <span className="lb-medalj">{MEDALJER[i]}</span> : <span className="lb-plats">{i + 1}</span>}
            <span className={`lb-namn${ärJag ? ' mig' : ''}`}>{rad.namn}{ärJag && ' (du)'}</span>
            <span className="lb-poäng">{rad.poäng ?? 0}<span className="lb-poäng-lbl">p</span></span>
          </div>
        )
      })}
    </div></>
  )
}
