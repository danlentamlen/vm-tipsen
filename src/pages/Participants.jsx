import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'

const medaljer = { 1: '🥇', 2: '🥈', 3: '🥉' }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .p-wrap { max-width: 900px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .p-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem;
  }
  .p-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1; margin-bottom: 1.75rem;
  }
  .p-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 0.875rem;
  }
  .p-card {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px;
    padding: 1.25rem 1rem 1rem;
    cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .p-card:hover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    border-color: rgba(197,160,40,0.4);
    transform: translateY(-2px);
  }
  .p-card.is-me { border-color: #C5A028; border-width: 2px; background: rgba(197,160,40,0.03); }
  .p-card.rank-1 { background: rgba(197,160,40,0.05); border-color: rgba(197,160,40,0.3); }
  .p-card.rank-2 { background: rgba(160,160,160,0.04); border-color: rgba(160,160,160,0.2); }
  .p-card.rank-3 { background: rgba(160,90,40,0.04); border-color: rgba(160,90,40,0.15); }

  .p-place {
    position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 10px; border-radius: 100px; white-space: nowrap;
  }
  .p-place.top { background: linear-gradient(135deg, #0a1628, #1a2e4a); color: #F0D060; }
  .p-place.normal { background: #f0ede6; color: #999; }

  .p-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 700;
    margin: 0.75rem 0 0.5rem;
    background: rgba(10,22,40,0.07); color: #0a1628;
  }
  .p-card.rank-1 .p-avatar { background: rgba(197,160,40,0.18); color: #7a5c10; }
  .p-card.rank-2 .p-avatar { background: rgba(150,150,150,0.15); color: #555; }
  .p-card.rank-3 .p-avatar { background: rgba(160,90,40,0.12); color: #7a4520; }
  .p-card.is-me .p-avatar  { background: rgba(197,160,40,0.18); color: #7a5c10; }

  .p-name {
    font-family: 'Barlow', sans-serif; font-size: 0.9rem; font-weight: 500;
    color: #0a1628; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    width: 100%; margin-bottom: 0.3rem;
  }
  .p-points {
    font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700;
    color: #C8102E; line-height: 1; margin-bottom: 0.5rem;
  }
  .p-points .unit { font-size: 0.7rem; font-weight: 600; color: #bbb; margin-left: 1px; }
  .p-no-points { font-size: 0.72rem; color: #ccc; margin-bottom: 0.5rem; font-family: 'Barlow', sans-serif; }

  .p-divider { width: 100%; height: 1px; background: rgba(0,0,0,0.06); margin: 0.4rem 0; }

  .p-wine {
    font-family: 'Barlow', sans-serif; font-size: 0.73rem;
    color: #999; width: 100%; display: flex; align-items: center; gap: 4px;
    margin-bottom: 2px;
  }
  .p-wine a {
    color: #999; text-decoration: none; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
    transition: color 0.15s;
  }
  .p-wine a:hover { color: #C5A028; text-decoration: underline; }

  .p-winner {
    font-family: 'Barlow', sans-serif; font-size: 0.73rem;
    color: #555; width: 100%; display: flex; align-items: center; gap: 4px;
  }
  .p-winner-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }

  @media (max-width: 480px) {
    .p-grid { grid-template-columns: repeat(2, 1fr); gap: 0.625rem; }
    .p-card { padding: 1rem 0.75rem 0.875rem; }
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
      fetch('/.netlify/functions/participants').then((r) => r.json()),
      fetch('/.netlify/functions/viner-hamta').then((r) => r.json()).catch(() => []),
      fetch('/.netlify/functions/scores').then((r) => r.json()).catch(() => []),
    ]
    if (tipsLåst) {
      reqs.push(
        fetch('/.netlify/functions/vm-vinnare').then((r) => r.json()).catch(() => ({}))
      )
    }

    Promise.all(reqs).then(([deltagarData, vinerData, scoresData, vinnareData]) => {
      setDeltagare(Array.isArray(deltagarData) ? deltagarData : [])

      const vMap = {}
      if (Array.isArray(vinerData)) {
        vinerData.forEach((v) => { if (v.vin_namn) vMap[v.user_id] = v })
      }
      setViner(vMap)

      const pMap = {}
      if (Array.isArray(scoresData)) {
        scoresData.forEach((rad) => { pMap[rad.user_id] = { plats: rad.plats, poäng: rad.poäng } })
      }
      setPoäng(pMap)

      if (vinnareData && typeof vinnareData === 'object') {
        setVmVinnare(vinnareData)
      }

      setLaddar(false)
    })
  }, [tipsLåst])

  if (laddar) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
        Laddar deltagare...
      </div>
    )
  }

  // Sort by placement if scores exist, otherwise alphabetically
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
                {/* Placement badge */}
                {plats && (
                  <div className={`p-place ${plats <= 3 ? 'top' : 'normal'}`}>
                    {plats <= 3 ? `${medaljer[plats]} #${plats}` : `#${plats}`}
                  </div>
                )}

                {/* Avatar */}
                <div className="p-avatar">{d.namn.charAt(0).toUpperCase()}</div>

                {/* Name */}
                <div className="p-name" title={d.namn}>{d.namn}</div>

                {/* Points */}
                {stats
                  ? <div className="p-points">{stats.poäng}<span className="unit">p</span></div>
                  : <div className="p-no-points">Inga poäng än</div>
                }

                {/* Wine + VM winner */}
                {harExtra && <div className="p-divider" />}

                {vin && (
                  <div className="p-wine">
                    <span>🍷</span>
                    <a
                      href={vin.vin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={vin.vin_namn}
                    >
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