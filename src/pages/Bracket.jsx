import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import KnockoutBracket from '../components/KnockoutBracket'
import { normName } from '../components/MatchKort'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800&family=Barlow:wght@400;500&display=swap');

  .bracket-page-wrap {
    background:#07101f;
    min-height:calc(100vh - 60px);
    padding:2rem 0.5rem 4rem;
  }
  .bracket-page-inner {
    max-width:1200px;
    margin:0 auto;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
    padding:0 8px;
  }
  @media (max-width:600px) {
    .bracket-page-wrap { padding:1rem 0 3rem; }
    .bracket-page-inner { padding:0 4px; }
  }
`

export default function Bracket() {
  const { användare } = useAuth()
  const [matcher, setMatcher]         = useState([])
  const [matchStats, setMatchStats]   = useState({})
  const [liveScores, setLiveScores]   = useState([])
  const [minaTips, setMinaTips]       = useState({})
  const [laddar, setLaddar]           = useState(true)
  const liveRef                       = useRef(null)

  useEffect(() => {
    hämtaData()
    hämtaLive()
    liveRef.current = setInterval(hämtaLive, 60 * 1000)
    const vidFokus = () => { if (document.visibilityState === 'visible') hämtaLive() }
    document.addEventListener('visibilitychange', vidFokus)
    return () => {
      clearInterval(liveRef.current)
      document.removeEventListener('visibilitychange', vidFokus)
    }
  }, [användare])

  async function hämtaData() {
    const [matchRes, statsRes, tipsRes] = await Promise.allSettled([
      fetch('/.netlify/functions/matches').then((r) => r.json()),
      fetch('/.netlify/functions/match-stats').then((r) => r.json()),
      användare
        ? fetch(`/.netlify/functions/tips?t=${Date.now()}`, {
            headers: { Authorization: `Bearer ${användare.token}` },
          }).then((r) => r.json())
        : Promise.resolve([]),
    ])

    if (matchRes.status === 'fulfilled') {
      setMatcher(Array.isArray(matchRes.value) ? matchRes.value : [])
    }
    if (statsRes.status === 'fulfilled' && !statsRes.value?.error) {
      setMatchStats(statsRes.value || {})
    }
    if (tipsRes.status === 'fulfilled' && Array.isArray(tipsRes.value)) {
      const map = {}
      tipsRes.value.forEach((t) => { map[t.match_id] = t })
      setMinaTips(map)
    }
    setLaddar(false)
  }

  async function hämtaLive() {
    try {
      const data = await fetch('/.netlify/functions/live-scores').then((r) => r.json())
      setLiveScores(Array.isArray(data) ? data : [])
    } catch {
      setLiveScores([])
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="bracket-page-wrap">
        <div className="bracket-page-inner">
          {laddar ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '4rem 0',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,.3)',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.1)',
                borderTopColor: 'rgba(255,255,255,.5)',
                animation: 'spin .7s linear infinite',
              }} />
              Laddar slutspelsträd…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <KnockoutBracket
              matcher={matcher}
              matchStats={matchStats}
              liveScores={liveScores}
              minaTips={minaTips}
              inloggad={!!användare}
              compact={false}
            />
          )}
        </div>
      </div>
    </>
  )
}
