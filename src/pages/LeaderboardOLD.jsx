import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Leaderboard() {
  const [topplista, setTopplista] = useState([])
  const [laddar, setLaddar] = useState(true)
  const { användare } = useAuth()

  useEffect(() => {
    hämtaTopplista()
  }, [])

  async function hämtaTopplista() {
    const res = await fetch('/.netlify/functions/scores')
    const data = await res.json()
    setTopplista(data)
    setLaddar(false)
  }

  if (laddar) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
        Laddar topplista...
      </div>
    )
  }

  if (topplista.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</p>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e4a', marginBottom: '0.5rem' }}>
          Inga resultat än
        </h2>
        <p style={{ color: '#888' }}>Topplistan uppdateras när matchresultat matas in.</p>
      </div>
    )
  }

  const medaljer = ['🥇', '🥈', '🥉']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

        .lb-wrap {
          max-width: 760px;
          margin: 0 auto;
          padding: 2rem 1rem 4rem;
        }
        .lb-header {
          margin-bottom: 1.75rem;
        }
        .lb-eyebrow {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #C8102E;
          margin-bottom: 0.3rem;
        }
        .lb-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1.8rem, 6vw, 2.8rem);
          font-weight: 700;
          color: #0a1628;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        .lb-table {
          background: #fff;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.07);
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .lb-thead {
          display: grid;
          grid-template-columns: 48px 1fr 80px 64px 64px 64px;
          background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%);
          padding: 0.75rem 1.25rem;
          gap: 0;
        }
        .lb-th {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          text-align: center;
        }
        .lb-th:nth-child(2) { text-align: left; }

        .lb-row {
          display: grid;
          grid-template-columns: 48px 1fr 80px 64px 64px 64px;
          padding: 0.85rem 1.25rem;
          gap: 0;
          align-items: center;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          transition: background 0.15s;
        }
        .lb-row:last-child { border-bottom: none; }
        .lb-row:hover { background: #f8f7f4; }
        .lb-row.is-me {
          background: rgba(197,160,40,0.07);
          border-left: 3px solid #C5A028;
        }
        .lb-row.top-1 { background: rgba(197,160,40,0.06); }
        .lb-row.top-2 { background: rgba(180,180,180,0.05); }
        .lb-row.top-3 { background: rgba(176,100,50,0.05); }

        .lb-place {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.2rem;
          text-align: center;
          line-height: 1;
        }
        .lb-place-num {
          font-size: 0.85rem;
          font-weight: 600;
          color: #aaa;
        }

        .lb-name {
          font-family: 'Barlow', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #0a1628;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .lb-name-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lb-me-badge {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(197,160,40,0.15);
          color: #8a6e1a;
          border: 1px solid rgba(197,160,40,0.3);
          padding: 2px 8px;
          border-radius: 100px;
          flex-shrink: 0;
        }

        .lb-points {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: #C8102E;
          text-align: center;
        }
        .lb-cell {
          font-family: 'Barlow', sans-serif;
          font-size: 0.88rem;
          color: #666;
          text-align: center;
        }

        .lb-legend {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 1.25rem;
          font-family: 'Barlow', sans-serif;
          font-size: 0.82rem;
          color: #888;
        }
        .lb-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lb-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        @media (max-width: 520px) {
          .lb-thead {
            grid-template-columns: 40px 1fr 64px 48px 48px 48px;
            padding: 0.65rem 0.75rem;
          }
          .lb-row {
            grid-template-columns: 40px 1fr 64px 48px 48px 48px;
            padding: 0.75rem 0.75rem;
          }
          .lb-th, .lb-cell { font-size: 0.75rem; }
          .lb-points { font-size: 1.1rem; }
          .lb-name { font-size: 0.88rem; }
        }
      `}</style>

      <div className="lb-wrap">
        <div className="lb-header">
          <p className="lb-eyebrow">VM-tipsen 2026</p>
          <h2 className="lb-title">Topplista</h2>
        </div>

        <div className="lb-table">
          {/* Thead */}
          <div className="lb-thead">
            <div className="lb-th">#</div>
            <div className="lb-th">Namn</div>
            <div className="lb-th">Poäng</div>
            <div className="lb-th">Exakta</div>
            <div className="lb-th">Rätta</div>
            <div className="lb-th">Frågor</div>
          </div>

          {/* Rows */}
          {topplista.map((rad) => {
            const ärJag = användare?.user_id === rad.user_id
            const rowClass = [
              'lb-row',
              ärJag ? 'is-me' : '',
              rad.plats === 1 ? 'top-1' : '',
              rad.plats === 2 ? 'top-2' : '',
              rad.plats === 3 ? 'top-3' : '',
            ].filter(Boolean).join(' ')

            return (
              <div key={rad.user_id} className={rowClass}>
                <div className="lb-place">
                  {rad.plats <= 3
                    ? medaljer[rad.plats - 1]
                    : <span className="lb-place-num">{rad.plats}</span>
                  }
                </div>
                <div className="lb-name">
                  <span className="lb-name-text">{rad.namn}</span>
                  {ärJag && <span className="lb-me-badge">Du</span>}
                </div>
                <div className="lb-points">{rad.poäng}</div>
                <div className="lb-cell">{rad.exakta}</div>
                <div className="lb-cell">{rad.rätta}</div>
                <div className="lb-cell">{rad.frågepoäng}</div>
              </div>
            )
          })}
        </div>

        <div className="lb-legend">
          <div className="lb-legend-item">
            <div className="lb-legend-dot" style={{ background: '#C8102E' }} />
            Exakt rätt resultat = <strong>5p</strong>
          </div>
          <div className="lb-legend-item">
            <div className="lb-legend-dot" style={{ background: '#1a2e4a' }} />
            Rätt utgång = <strong>2p</strong>
          </div>
          <div className="lb-legend-item">
            <div className="lb-legend-dot" style={{ background: '#C5A028' }} />
            Bonusfrågor = varierar
          </div>
        </div>
      </div>
    </>
  )
}