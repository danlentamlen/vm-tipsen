import { useState, useEffect } from 'react'

// Flagglookup — samma som i Matches.jsx
const FLAGS = {
  'Argentina':'🇦🇷','Australia':'🇦🇺','Austria':'🇦🇹','Belgium':'🇧🇪',
  'Bolivia':'🇧🇴','Bosnia & Herzegovina':'🇧🇦','Bosnia and Herzegovina':'🇧🇦',
  'Brazil':'🇧🇷','Cameroon':'🇨🇲','Canada':'🇨🇦','Chile':'🇨🇱',
  'China':'🇨🇳','China PR':'🇨🇳','Colombia':'🇨🇴','Costa Rica':'🇨🇷',
  'Croatia':'🇭🇷','Czech Republic':'🇨🇿','Czechia':'🇨🇿','Denmark':'🇩🇰',
  'Ecuador':'🇪🇨','Egypt':'🇪🇬','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','France':'🇫🇷',
  'Germany':'🇩🇪','Ghana':'🇬🇭','Greece':'🇬🇷','Honduras':'🇭🇳',
  'Hungary':'🇭🇺','Indonesia':'🇮🇩','Iran':'🇮🇷','IR Iran':'🇮🇷',
  'Iraq':'🇮🇶','Japan':'🇯🇵','Kenya':'🇰🇪','Mexico':'🇲🇽',
  'Morocco':'🇲🇦','Netherlands':'🇳🇱','New Zealand':'🇳🇿','Nigeria':'🇳🇬',
  'North Korea':'🇰🇵','Korea DPR':'🇰🇵','Norway':'🇳🇴','Panama':'🇵🇦',
  'Paraguay':'🇵🇾','Peru':'🇵🇪','Poland':'🇵🇱','Portugal':'🇵🇹',
  'Qatar':'🇶🇦','Romania':'🇷🇴','Saudi Arabia':'🇸🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal':'🇸🇳','Serbia':'🇷🇸','Slovakia':'🇸🇰','Slovenia':'🇸🇮',
  'South Africa':'🇿🇦','South Korea':'🇰🇷','Korea Republic':'🇰🇷',
  'Spain':'🇪🇸','Sweden':'🇸🇪','Switzerland':'🇨🇭','Tunisia':'🇹🇳',
  'Turkey':'🇹🇷','Türkiye':'🇹🇷','Ukraine':'🇺🇦','Uruguay':'🇺🇾',
  'USA':'🇺🇸','United States':'🇺🇸','Venezuela':'🇻🇪','Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Curaçao':'🇨🇼','Curacao':'🇨🇼','Cabo Verde':'🇨🇻','Cape Verde':'🇨🇻',
}
const getFlag = (lag) => {
  if (!lag) return ''
  if (FLAGS[lag]) return FLAGS[lag]
  const hit = Object.keys(FLAGS).find((k) => k.toLowerCase() === lag.toLowerCase())
  return hit ? FLAGS[hit] : ''
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .sc-wrap { max-width: 760px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .sc-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .sc-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.75rem; }

  /* Table */
  .sc-table-wrap {
    background:#fff; border:1px solid rgba(0,0,0,.07);
    border-radius:12px; overflow:hidden;
    box-shadow:0 2px 12px rgba(0,0,0,.05);
  }
  .sc-thead {
    display:grid;
    grid-template-columns: 44px 1fr 120px 60px 60px 60px;
    background:linear-gradient(135deg,#0a1628,#1a2e4a);
    padding:.75rem 1rem;
  }
  .sc-th {
    font-family:'Barlow Condensed',sans-serif;
    font-size:.68rem; font-weight:600; letter-spacing:.14em;
    text-transform:uppercase; color:rgba(255,255,255,.45);
    text-align:center;
  }
  .sc-th:nth-child(2) { text-align:left; }

  .sc-row {
    display:grid;
    grid-template-columns: 44px 1fr 120px 60px 60px 60px;
    padding:.75rem 1rem;
    align-items:center;
    border-bottom:1px solid rgba(0,0,0,.05);
    transition:background .15s;
  }
  .sc-row:last-child { border-bottom:none; }
  .sc-row:hover { background:#fafaf8; }
  .sc-row.top-1 { background:rgba(197,160,40,.06); }
  .sc-row.top-2 { background:rgba(180,180,180,.04); }
  .sc-row.top-3 { background:rgba(160,90,40,.04); }

  .sc-place {
    font-family:'Barlow Condensed',sans-serif;
    font-size:1.1rem; text-align:center; line-height:1;
  }
  .sc-place-num { font-size:.85rem; font-weight:600; color:#bbb; }

  .sc-player { min-width:0; }
  .sc-player-name {
    font-family:'Barlow',sans-serif; font-size:.92rem; font-weight:500;
    color:#0a1628; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .sc-player-team {
    font-family:'Barlow',sans-serif; font-size:.72rem; color:#aaa;
    display:flex; align-items:center; gap:4px; margin-top:1px;
  }

  .sc-goals {
    font-family:'Barlow Condensed',sans-serif;
    font-size:1.3rem; font-weight:700; color:#C8102E;
    text-align:center; line-height:1;
  }
  .sc-cell {
    font-family:'Barlow',sans-serif; font-size:.85rem;
    color:#888; text-align:center;
  }

  /* Pre-tournament banner */
  .sc-banner {
    display:flex; align-items:flex-start; gap:12px;
    background:rgba(197,160,40,.08); border:1px solid rgba(197,160,40,.25);
    border-radius:10px; padding:1rem 1.1rem; margin-bottom:1.5rem;
    font-family:'Barlow',sans-serif; font-size:.88rem; color:#7a5c10; line-height:1.5;
  }

  /* Last updated */
  .sc-updated {
    font-family:'Barlow',sans-serif; font-size:.72rem; color:#ccc;
    text-align:right; margin-top:.75rem;
  }

  @media (max-width:520px) {
    .sc-thead { grid-template-columns: 36px 1fr 90px 48px 48px; }
    .sc-row   { grid-template-columns: 36px 1fr 90px 48px 48px; }
    .sc-thead .sc-th:nth-child(6),
    .sc-row   .sc-cell:last-child { display:none; }
    .sc-goals { font-size:1.1rem; }
    .sc-player-name { font-size:.82rem; }
  }
`

const medaljer = { 1:'🥇', 2:'🥈', 3:'🥉' }

export default function Scorers() {
  const [data, setData] = useState(null)
  const [laddar, setLaddar] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/scorers')
      .then((r) => r.json())
      .then((d) => { setData(d); setLaddar(false) })
      .catch(() => setLaddar(false))
  }, [])

  if (laddar) {
    return <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#888' }}>Laddar skytteliga...</div>
  }

  const scorers = data?.scorers || []
  const uppdaterad = data?.uppdaterad

  return (
    <>
      <style>{STYLES}</style>
      <div className="sc-wrap">
        <p className="sc-eyebrow">VM 2026</p>
        <h2 className="sc-title">Skytteliga</h2>

        {scorers.length === 0 ? (
          <div className="sc-banner">
            <span>⏳</span>
            <span>Skytteligan visas när VM har startat och matcher spelats. Kom tillbaka den 11 juni!</span>
          </div>
        ) : (
          <>
            <div className="sc-table-wrap">
              {/* Header */}
              <div className="sc-thead">
                <div className="sc-th">#</div>
                <div className="sc-th">Spelare</div>
                <div className="sc-th">Lag</div>
                <div className="sc-th">Mål</div>
                <div className="sc-th">Ass.</div>
                <div className="sc-th">Mat.</div>
              </div>

              {/* Rows */}
              {scorers.map((s) => {
                const rowClass = [
                  'sc-row',
                  s.plats === 1 ? 'top-1' : '',
                  s.plats === 2 ? 'top-2' : '',
                  s.plats === 3 ? 'top-3' : '',
                ].filter(Boolean).join(' ')

                return (
                  <div key={`${s.namn}-${s.plats}`} className={rowClass}>
                    <div className="sc-place">
                      {s.plats <= 3
                        ? medaljer[s.plats]
                        : <span className="sc-place-num">{s.plats}</span>
                      }
                    </div>
                    <div className="sc-player">
                      <div className="sc-player-name">{s.namn}</div>
                      <div className="sc-player-team">
                        {getFlag(s.lag) && <span>{getFlag(s.lag)}</span>}
                      </div>
                    </div>
                    <div className="sc-cell" style={{ textAlign:'left', paddingLeft:4 }}>
                      <span style={{ fontSize:'.82rem', color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                        {getFlag(s.lag)} {s.lag}
                      </span>
                    </div>
                    <div className="sc-goals">{s.mål}</div>
                    <div className="sc-cell">{s.assists ?? '–'}</div>
                    <div className="sc-cell">{s.matcher}</div>
                  </div>
                )
              })}
            </div>

            {uppdaterad && (
              <p className="sc-updated">
                Uppdaterad: {new Date(uppdaterad).toLocaleString('sv-SE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}