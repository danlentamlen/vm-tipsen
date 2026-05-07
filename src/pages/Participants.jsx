import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'

const medaljer = { 1: '🥇', 2: '🥈', 3: '🥉' }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .p-wrap { max-width:900px; margin:0 auto; padding:2rem 1rem 4rem; }
  .p-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .p-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  .p-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:.875rem; }

  .p-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.25rem 1rem 1rem; cursor:pointer; transition:box-shadow .15s,border-color .15s,transform .15s; display:flex; flex-direction:column; align-items:center; text-align:center; position:relative; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .p-card:hover { box-shadow:0 6px 20px rgba(0,0,0,.1); border-color:rgba(197,160,40,.4); transform:translateY(-2px); }
  .p-card.is-me { border-color:#C5A028; border-width:2px; background:rgba(197,160,40,.03); }
  .p-card.rank-1 { background:rgba(197,160,40,.05); border-color:rgba(197,160,40,.3); }
  .p-card.rank-2 { background:rgba(160,160,160,.04); border-color:rgba(160,160,160,.2); }
  .p-card.rank-3 { background:rgba(176,107,0,.04); border-color:rgba(176,107,0,.15); }

  .p-place { position:absolute; top:8px; left:8px; font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.06em; padding:2px 7px; border-radius:100px; background:rgba(0,0,0,.06); color:#555; }
  .p-place.top { background:rgba(197,160,40,.15); color:#7a5c10; }

  .p-avatar { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin-bottom:.625rem; flex-shrink:0; }

  .p-name { font-family:'Barlow',sans-serif; font-size:.9rem; font-weight:600; color:#0a1628; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:.25rem; }

  /* Rekryteringsbadge */
  .p-rek-badge { display:inline-flex; align-items:center; gap:4px; font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; background:rgba(197,160,40,.12); color:#7a5c10; border:1px solid rgba(197,160,40,.25); border-radius:100px; padding:2px 8px; margin-bottom:.375rem; }

  .p-points { font-family:'Barlow Condensed',sans-serif; font-size:1.5rem; font-weight:700; color:#C8102E; line-height:1; }
  .p-points .unit { font-size:.85rem; color:#aaa; margin-left:2px; }
  .p-no-points { font-family:'Barlow',sans-serif; font-size:.75rem; color:#ccc; }

  .p-divider { width:100%; height:1px; background:rgba(0,0,0,.06); margin:.4rem 0; }

  .p-wine { font-family:'Barlow',sans-serif; font-size:.73rem; color:#999; width:100%; display:flex; align-items:center; gap:4px; margin-bottom:2px; }
  .p-wine a { color:#999; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; transition:color .15s; }
  .p-wine a:hover { color:#C5A028; text-decoration:underline; }

  .p-winner { font-family:'Barlow',sans-serif; font-size:.73rem; color:#555; width:100%; display:flex; align-items:center; gap:4px; }
  .p-winner-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }

  @media (max-width:480px) {
    .p-grid { grid-template-columns:repeat(2, 1fr); gap:.625rem; }
    .p-card { padding:1rem .75rem .875rem; }
  }
`

export default function Participants() {
  const [deltagare, setDeltagare] = useState([])
  const [viner, setViner] = useState({})
  const [poäng, setPoäng] = useState({})
  const [vmVinnare, setVmVinnare] = useState({})
  const [laddar, setLaddar] = useState(true)
  const { användare } = useAuth()
  const { tipsLåst } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    const reqs = [
      fetch('/.netlify/functions/participants').then(r => r.json()),
      fetch('/.netlify/functions/viner-hamta').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/scores').then(r => r.json()).catch(() => []),
    ]
    if (tipsLåst) {
      reqs.push(fetch('/.netlify/functions/vm-vinnare').then(r => r.json()).catch(() => ({})))
    }

    Promise.all(reqs).then(([deltagarData, vinerData, scoresData, vinnareData]) => {
      setDeltagare(Array.isArray(deltagarData) ? deltagarData : [])

      const vMap = {}
      if (Array.isArray(vinerData)) {
        vinerData.forEach(v => { if (v.vin_namn) vMap[v.user_id] = v })
      }
      setViner(vMap)

      const pMap = {}
      if (Array.isArray(scoresData)) {
        scoresData.forEach(rad => { pMap[rad.user_id] = { plats: rad.plats, poäng: rad.poäng } })
      }
      setPoäng(pMap)

      if (vinnareData && typeof vinnareData === 'object') setVmVinnare(vinnareData)
      setLaddar(false)
    })
  }, [tipsLåst])

  if (laddar) {
    return <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#888' }}>Laddar deltagare...</div>
  }

  const sorterade = [...deltagare].sort((a, b) => {
    const pa = poäng[a.user_id]?.plats
    const pb = poäng[b.user_id]?.plats
    if (pa && pb) return pa - pb
    if (pa) return -1
    if (pb) return 1
    return a.namn.localeCompare(b.namn, 'sv')
  })

  return (
    <>
      <style>{STYLES}</style>
      <div className="p-wrap">
        <p className="p-eyebrow">VM-tipsen 2026</p>
        <h2 className="p-title">Deltagare</h2>

        <div className="p-grid">
          {sorterade.map((d) => {
            const stats = poäng[d.user_id]
            const vin = viner[d.user_id]
            const vinnartips = tipsLåst ? vmVinnare[d.user_id] : null
            const ärJag = användare?.user_id === d.user_id
            const plats = stats?.plats
            const harRekryterat = d.rekryterade_antal > 0

            const cardClass = [
              'p-card',
              ärJag ? 'is-me' : '',
              !ärJag && plats === 1 ? 'rank-1' : '',
              !ärJag && plats === 2 ? 'rank-2' : '',
              !ärJag && plats === 3 ? 'rank-3' : '',
            ].filter(Boolean).join(' ')

            const harExtra = vin || vinnartips

            return (
              <div
                key={d.user_id}
                className={cardClass}
                onClick={() => navigate(`/participant/${d.user_id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/participant/${d.user_id}`)}
              >
                {plats && (
                  <div className={`p-place ${plats <= 3 ? 'top' : 'normal'}`}>
                    {plats <= 3 ? `${medaljer[plats]} #${plats}` : `#${plats}`}
                  </div>
                )}

                <div className="p-avatar">{d.namn.charAt(0).toUpperCase()}</div>
                <div className="p-name" title={d.namn}>{d.namn}</div>

                {/* Rekryteringsbadge — bara om > 0 */}
                {harRekryterat && (
                  <div className="p-rek-badge">
                    👤 {d.rekryterade_antal} rekryterad{d.rekryterade_antal !== 1 ? 'e' : ''}
                  </div>
                )}

                {stats
                  ? <div className="p-points">{stats.poäng}<span className="unit">p</span></div>
                  : <div className="p-no-points">Inga poäng än</div>
                }

                {harExtra && <div className="p-divider" />}

                {vin && (
                  <div className="p-wine">
                    <span>🍷</span>
                    <a href={vin.vin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={vin.vin_namn}>
                      {vin.vin_namn}
                    </a>
                  </div>
                )}

                {vinnartips && (
                  <div className="p-winner">
                    <span>⚽</span>
                    <span className="p-winner-text" title={vinnartips}>{vinnartips}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}