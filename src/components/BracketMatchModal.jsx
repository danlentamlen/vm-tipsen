import { useState, useEffect, useRef } from 'react'
import { getFlag, formatTid } from './MatchKort'

const ROUND_LABELS = {
  'Round of 32':           'Sextondelsfinale',
  'Round of 16':           'Åttondelsfinal',
  'Quarter-final':         'Kvartsfinal',
  'Semi-final':            'Semifinal',
  'Match for third place': 'Match om 3:e plats',
  'Final':                 'Final',
}

// ── Poäng-uträkning (spegel av _scoring.js logik) ───────────────────────────
function beräknaPoäng(tip, stats) {
  if (!tip || stats?.resultat_hemma === undefined) return null
  const rh = stats.resultat_hemma
  const rb = stats.resultat_borta
  const th = Number(tip.hemma_mål)
  const tb = Number(tip.borta_mål)
  if (isNaN(th) || isNaN(tb)) return null
  if (th === rh && tb === rb) return 5  // exakt
  const utfall = (n) => n > 0 ? 1 : n < 0 ? -1 : 0
  if (utfall(th - tb) === utfall(rh - rb)) return 2  // rätt vinnare
  return 0
}

// ── Live-ställning ────────────────────────────────────────────────────────────
function getLive(match, liveScores) {
  return liveScores?.find(
    (l) =>
      l.hemmalag?.toLowerCase().trim() === match.hemmalag?.toLowerCase().trim() &&
      l.bortalag?.toLowerCase().trim() === match.bortalag?.toLowerCase().trim()
  ) || null
}

// ── Formatera datum ───────────────────────────────────────────────────────────
function formatDatum(datum) {
  if (!datum) return ''
  try {
    return new Date(datum).toLocaleDateString('sv-SE', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch { return datum }
}

// ── Fördelningsdata ────────────────────────────────────────────────────────────
function useDistribution(matchId) {
  const [data, setData]     = useState(null)
  const [laddar, setLaddar] = useState(true)
  const [fel, setFel]       = useState(null)
  const [öppna, setÖppna]   = useState(new Set())
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!matchId || hasFetched.current) return
    hasFetched.current = true
    setLaddar(true)
    fetch(`/.netlify/functions/distribution?match_id=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setFel(d.error)
        else setData(d)
        setLaddar(false)
      })
      .catch(() => { setFel('Kunde inte hämta fördelning'); setLaddar(false) })
  }, [matchId])

  return { data, laddar, fel, öppna, setÖppna }
}

const MODAL_CSS = `
  .bmm-overlay {
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,.72);
    display:flex; align-items:center; justify-content:center;
    padding:16px;
    animation:bmm-in .18s ease;
  }
  @keyframes bmm-in { from{opacity:0} to{opacity:1} }

  .bmm-panel {
    background:#0d1b33;
    border:1px solid rgba(255,255,255,.1);
    border-radius:14px;
    width:100%; max-width:420px;
    max-height:88vh;
    overflow-y:auto;
    animation:bmm-up .2s ease;
    box-shadow:0 24px 64px rgba(0,0,0,.5);
  }
  @keyframes bmm-up { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }

  /* Scrollbar */
  .bmm-panel::-webkit-scrollbar { width:4px; }
  .bmm-panel::-webkit-scrollbar-track { background:transparent; }
  .bmm-panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:2px; }

  /* ── Header ── */
  .bmm-hdr {
    position:sticky; top:0; z-index:2;
    background:#0d1b33;
    border-bottom:1px solid rgba(255,255,255,.07);
    padding:12px 16px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .bmm-round-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.22em;
    text-transform:uppercase; color:#C5A028;
  }
  .bmm-close {
    width:28px; height:28px; border-radius:50%;
    background:rgba(255,255,255,.07); border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    color:rgba(255,255,255,.5); font-size:15px; font-weight:300;
    transition:background .15s, color .15s;
    flex-shrink:0;
  }
  .bmm-close:hover { background:rgba(255,255,255,.14); color:#fff; }

  /* ── Matchrad ── */
  .bmm-match {
    padding:16px 16px 12px;
    border-bottom:1px solid rgba(255,255,255,.06);
  }
  .bmm-teams {
    display:flex; align-items:center; justify-content:space-between; gap:8px;
  }
  .bmm-team {
    display:flex; flex-direction:column; align-items:center; gap:5px;
    flex:1; min-width:0;
  }
  .bmm-team-flag { font-size:28px; line-height:1; }
  .bmm-team-name {
    font-family:'Barlow Condensed',sans-serif;
    font-size:15px; font-weight:700; letter-spacing:.05em;
    color:rgba(255,255,255,.8); text-align:center;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;
  }
  .bmm-team-name.winner { color:#fff; }
  .bmm-team-name.eliminated { opacity:.35; }

  .bmm-score-col {
    display:flex; flex-direction:column; align-items:center; gap:4px;
    flex-shrink:0; min-width:70px;
  }
  .bmm-score {
    font-family:'Barlow Condensed',sans-serif;
    font-size:36px; font-weight:800; letter-spacing:.06em;
    color:#F0D060; line-height:1;
  }
  .bmm-score-tbd {
    font-family:'Barlow Condensed',sans-serif;
    font-size:22px; font-weight:700;
    color:rgba(255,255,255,.2); letter-spacing:.1em;
  }
  .bmm-live-badge {
    display:inline-flex; align-items:center; gap:4px;
    background:#C8102E; border-radius:100px; padding:3px 8px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.12em;
    color:#fff; text-transform:uppercase;
  }
  .bmm-live-dot {
    width:5px; height:5px; border-radius:50%; background:#fff;
    animation:bmm-pulse 1.1s ease infinite;
  }
  @keyframes bmm-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .bmm-result-klar {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.12em;
    text-transform:uppercase; color:rgba(255,255,255,.3);
  }

  .bmm-meta {
    margin-top:10px;
    display:flex; align-items:center; justify-content:center; gap:8px;
    font-family:'Barlow',sans-serif; font-size:11px; color:rgba(255,255,255,.3);
  }
  .bmm-meta-sep { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.2); }

  /* ── Eget tips ── */
  .bmm-section { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,.06); }
  .bmm-section-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.2em;
    text-transform:uppercase; color:rgba(255,255,255,.3); margin-bottom:8px;
  }
  .bmm-tip-row {
    display:flex; align-items:center; gap:10px;
  }
  .bmm-tip-score {
    font-family:'Barlow Condensed',sans-serif;
    font-size:22px; font-weight:800; letter-spacing:.06em;
    color:rgba(255,255,255,.7);
  }
  .bmm-tip-badge {
    display:inline-flex; align-items:center; gap:4px;
    border-radius:100px; padding:3px 10px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:10px; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase;
  }
  .bmm-tip-badge.exact   { background:rgba(40,200,100,.15); color:#3ddc84; }
  .bmm-tip-badge.winner  { background:rgba(197,160,40,.15); color:#F0D060; }
  .bmm-tip-badge.wrong   { background:rgba(200,16,46,.12); color:#ff6080; }
  .bmm-tip-badge.pending { background:rgba(255,255,255,.07); color:rgba(255,255,255,.4); }
  .bmm-no-tip {
    font-family:'Barlow',sans-serif; font-size:12px;
    color:rgba(255,255,255,.25); font-style:italic;
  }

  /* ── Stats-bar (% tipps) ── */
  .bmm-oddsbar { margin-top:4px; }
  .bmm-oddsbar-track {
    height:6px; border-radius:4px; display:flex; overflow:hidden; gap:2px;
  }
  .bmm-oddsbar-home { background:#2563eb; border-radius:3px 0 0 3px; transition:width .4s; }
  .bmm-oddsbar-draw { background:#6b7280; }
  .bmm-oddsbar-away { background:#C8102E; border-radius:0 3px 3px 0; transition:width .4s; }
  .bmm-oddsbar-labels {
    display:flex; justify-content:space-between; margin-top:5px;
  }
  .bmm-oddsbar-side {
    display:flex; flex-direction:column; gap:1px;
  }
  .bmm-oddsbar-side.right { align-items:flex-end; }
  .bmm-oddsbar-team {
    font-family:'Barlow',sans-serif; font-size:10px; color:rgba(255,255,255,.35);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;
  }
  .bmm-oddsbar-pct {
    font-family:'Barlow Condensed',sans-serif;
    font-size:14px; font-weight:800; color:#fff;
  }
  .bmm-oddsbar-draw-col { display:flex; flex-direction:column; align-items:center; }
  .bmm-oddsbar-draw-lbl { font-family:'Barlow',sans-serif; font-size:10px; color:rgba(255,255,255,.3); }
  .bmm-oddsbar-draw-pct { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; color:rgba(255,255,255,.5); }

  /* ── Fördelning ── */
  .bmm-dist-row {
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.07);
    border-radius:8px; overflow:hidden;
    transition:border-color .15s;
  }
  .bmm-dist-row.correct { border-color:rgba(40,200,100,.3); background:rgba(40,200,100,.05); }
  .bmm-dist-btn {
    width:100%; background:none; border:none; cursor:pointer;
    padding:8px 12px; text-align:left;
    display:flex; flex-direction:column; gap:5px;
  }
  .bmm-dist-top {
    display:flex; align-items:center; justify-content:space-between;
  }
  .bmm-dist-resultat {
    font-family:'Barlow Condensed',sans-serif;
    font-size:13px; font-weight:700; color:rgba(255,255,255,.75);
    display:flex; align-items:center; gap:6px;
  }
  .bmm-dist-chevron {
    font-size:9px; color:rgba(255,255,255,.3);
    transition:transform .15s; display:inline-block;
  }
  .bmm-dist-chevron.open { transform:rotate(90deg); }
  .bmm-dist-badge-correct {
    font-family:'Barlow Condensed',sans-serif;
    font-size:8px; font-weight:700; letter-spacing:.1em;
    background:#3ddc84; color:#002a18; border-radius:100px; padding:1px 7px;
    text-transform:uppercase;
  }
  .bmm-dist-cnt {
    font-family:'Barlow',sans-serif; font-size:11px; color:rgba(255,255,255,.35);
    white-space:nowrap;
  }
  .bmm-dist-bar {
    height:4px; border-radius:2px; background:rgba(255,255,255,.06); overflow:hidden;
  }
  .bmm-dist-bar-fill {
    height:100%; border-radius:2px; background:rgba(255,255,255,.2); transition:width .4s;
  }
  .bmm-dist-row.correct .bmm-dist-bar-fill { background:#3ddc84; }
  .bmm-dist-namn {
    padding:6px 12px 10px;
    display:flex; flex-wrap:wrap; gap:5px;
    border-top:1px solid rgba(255,255,255,.05);
    max-height:120px; overflow-y:auto;
  }
  .bmm-dist-namn-chip {
    font-family:'Barlow',sans-serif; font-size:10px;
    background:rgba(255,255,255,.07); color:rgba(255,255,255,.6);
    border-radius:100px; padding:2px 9px;
  }
  .bmm-dist-row.correct .bmm-dist-namn-chip { background:rgba(40,200,100,.12); color:#3ddc84; }

  .bmm-laddar {
    display:flex; align-items:center; justify-content:center;
    padding:24px; gap:8px;
    font-family:'Barlow',sans-serif; font-size:12px; color:rgba(255,255,255,.3);
  }
  .bmm-spinner {
    width:14px; height:14px; border-radius:50%;
    border:2px solid rgba(255,255,255,.1);
    border-top-color:rgba(255,255,255,.5);
    animation:bmm-spin .7s linear infinite;
  }
  @keyframes bmm-spin { to{transform:rotate(360deg)} }

  .bmm-totalt {
    font-family:'Barlow',sans-serif; font-size:11px;
    color:rgba(255,255,255,.3); text-align:center;
    margin-bottom:8px;
  }
  .bmm-not-locked {
    font-family:'Barlow',sans-serif; font-size:12px;
    color:rgba(255,255,255,.3); text-align:center;
    font-style:italic; padding:4px 0 8px;
  }
`

export default function BracketMatchModal({ match, matchStats, liveScores, tip, inloggad, onStäng }) {
  const live = getLive(match, liveScores)
  const isLive   = !!live && live.status !== 'FINISHED'
  const slutFrånLive = !matchStats && live?.status === 'FINISHED' && live?.hemma != null

  const hemmaScore = matchStats?.resultat_hemma ?? (slutFrånLive ? live.hemma : null)
  const bortaScore = matchStats?.resultat_borta ?? (slutFrånLive ? live.borta : null)
  const harResultat = hemmaScore !== null && hemmaScore !== undefined
  const liveMinut  = isLive ? (live?.minut ?? null) : null

  const hemmaVinner = harResultat && hemmaScore > bortaScore
  const bortaVinner = harResultat && bortaScore > hemmaScore

  const synthStats = harResultat
    ? (matchStats || { resultat_hemma: Number(hemmaScore), resultat_borta: Number(bortaScore) })
    : null
  const poäng = tip && synthStats ? beräknaPoäng(tip, synthStats) : null
  const aktuelltRes = harResultat ? `${hemmaScore}-${bortaScore}` : null

  const { data: dist, laddar: distLaddar, fel: distFel, öppna, setÖppna } = useDistribution(match.match_id)

  function togglaRad(res) {
    setÖppna((prev) => {
      const ny = new Set(prev)
      ny.has(res) ? ny.delete(res) : ny.add(res)
      return ny
    })
  }

  // Stäng på Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onStäng() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onStäng])

  const roundLabel = ROUND_LABELS[match.omgång] || match.omgång || 'Slutspel'
  const tid = formatTid(match.tid)

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="bmm-overlay" onClick={onStäng}>
        <div className="bmm-panel" onClick={(e) => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="bmm-hdr">
            <span className="bmm-round-lbl">{roundLabel}</span>
            <button className="bmm-close" onClick={onStäng} aria-label="Stäng">✕</button>
          </div>

          {/* ── Matchbild ── */}
          <div className="bmm-match">
            <div className="bmm-teams">
              {/* Hemmalag */}
              <div className="bmm-team">
                <span className="bmm-team-flag">{getFlag(match.hemmalag)}</span>
                <span className={`bmm-team-name ${hemmaVinner ? 'winner' : bortaVinner ? 'eliminated' : ''}`}>
                  {match.hemmalag}
                </span>
              </div>

              {/* Score / TBD */}
              <div className="bmm-score-col">
                {harResultat ? (
                  <>
                    <div className="bmm-score">{hemmaScore}–{bortaScore}</div>
                    {isLive ? (
                      <div className="bmm-live-badge">
                        <span className="bmm-live-dot" />
                        {liveMinut ? `${liveMinut}'` : 'Live'}
                      </div>
                    ) : (
                      <div className="bmm-result-klar">Slutresultat</div>
                    )}
                  </>
                ) : isLive ? (
                  <>
                    <div className="bmm-score">{live.hemma ?? 0}–{live.borta ?? 0}</div>
                    <div className="bmm-live-badge">
                      <span className="bmm-live-dot" />
                      {liveMinut ? `${liveMinut}'` : 'Live'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bmm-score-tbd">vs</div>
                    {tid && (
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                        {tid}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bortalag */}
              <div className="bmm-team" style={{ alignItems: 'flex-end' }}>
                <span className="bmm-team-flag">{getFlag(match.bortalag)}</span>
                <span className={`bmm-team-name ${bortaVinner ? 'winner' : hemmaVinner ? 'eliminated' : ''}`} style={{ textAlign: 'right' }}>
                  {match.bortalag}
                </span>
              </div>
            </div>

            {/* Meta-info: datum + arena + TV-kanal */}
            <div className="bmm-meta">
              {match.datum && <span>{formatDatum(match.datum)}</span>}
              {match.datum && match.arena && <span className="bmm-meta-sep" />}
              {match.arena && <span>{match.arena}</span>}
              {(match.datum || match.arena) && match.kanal && <span className="bmm-meta-sep" />}
              {match.kanal && <span>📺 {match.kanal}</span>}
            </div>
          </div>

          {/* ── Eget tips ── */}
          {inloggad && (
            <div className="bmm-section">
              <div className="bmm-section-lbl">Ditt tips</div>
              {tip ? (
                <div className="bmm-tip-row">
                  <span className="bmm-tip-score">
                    {tip.hemma_mål}–{tip.borta_mål}
                  </span>
                  {harResultat && poäng !== null ? (
                    <span className={`bmm-tip-badge ${poäng === 5 ? 'exact' : poäng === 2 ? 'winner' : 'wrong'}`}>
                      {poäng === 5 ? '✓ Exakt! +5p' : poäng === 2 ? '✓ Rätt vinnare +2p' : '✗ Fel +0p'}
                    </span>
                  ) : !harResultat ? (
                    <span className="bmm-tip-badge pending">Ej spelad</span>
                  ) : null}
                </div>
              ) : (
                <div className="bmm-no-tip">Inget tips lämnat</div>
              )}
            </div>
          )}

          {/* ── Stats-bar: % som tippade hem/oav/bort ── */}
          {matchStats && (matchStats.hemma_pct !== undefined) && (
            <div className="bmm-section">
              <div className="bmm-section-lbl">Hur alla tippade</div>
              <div className="bmm-oddsbar">
                <div className="bmm-oddsbar-track">
                  <div className="bmm-oddsbar-home" style={{ width: `${matchStats.hemma_pct}%` }} />
                  <div className="bmm-oddsbar-draw" style={{ width: `${matchStats.draw_pct}%` }} />
                  <div className="bmm-oddsbar-away" style={{ width: `${matchStats.borta_pct}%` }} />
                </div>
                <div className="bmm-oddsbar-labels">
                  <div className="bmm-oddsbar-side">
                    <span className="bmm-oddsbar-team">{match.hemmalag}</span>
                    <span className="bmm-oddsbar-pct">{matchStats.hemma_pct}%</span>
                  </div>
                  <div className="bmm-oddsbar-draw-col">
                    <span className="bmm-oddsbar-draw-lbl">Oavgjort</span>
                    <span className="bmm-oddsbar-draw-pct">{matchStats.draw_pct}%</span>
                  </div>
                  <div className="bmm-oddsbar-side right">
                    <span className="bmm-oddsbar-team">{match.bortalag}</span>
                    <span className="bmm-oddsbar-pct">{matchStats.borta_pct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tipsfördelning ── */}
          <div className="bmm-section" style={{ borderBottom: 'none', paddingBottom: 16 }}>
            <div className="bmm-section-lbl">Tipsfördelning</div>

            {distLaddar && (
              <div className="bmm-laddar">
                <div className="bmm-spinner" />
                Laddar...
              </div>
            )}

            {distFel && !distLaddar && (
              <div className="bmm-not-locked">
                {distFel === 'Tips är inte låsta än'
                  ? 'Fördelningen visas när tipsen är låsta.'
                  : distFel}
              </div>
            )}

            {dist && !distLaddar && (
              <>
                <div className="bmm-totalt">{dist.totalt} tips lämnade</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dist.fördelning.map((rad, i) => {
                    const ärRätt  = aktuelltRes && rad.resultat === aktuelltRes
                    const ärÖppen = öppna.has(rad.resultat)
                    const namn    = rad.namn || []
                    return (
                      <div
                        key={i}
                        className={`bmm-dist-row ${ärRätt ? 'correct' : ''}`}
                      >
                        <button
                          className="bmm-dist-btn"
                          onClick={() => togglaRad(rad.resultat)}
                        >
                          <div className="bmm-dist-top">
                            <span className="bmm-dist-resultat">
                              <span className={`bmm-dist-chevron ${ärÖppen ? 'open' : ''}`}>▶</span>
                              {rad.resultat}
                              {ärRätt && <span className="bmm-dist-badge-correct">✓ Rätt</span>}
                            </span>
                            <span className="bmm-dist-cnt">{rad.antal} st ({rad.procent}%)</span>
                          </div>
                          <div className="bmm-dist-bar">
                            <div
                              className="bmm-dist-bar-fill"
                              style={{ width: `${rad.procent}%` }}
                            />
                          </div>
                        </button>

                        {ärÖppen && (
                          <div className="bmm-dist-namn">
                            {namn.length === 0 ? (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>Inga namn</span>
                            ) : (
                              namn.map((n, j) => (
                                <span key={j} className="bmm-dist-namn-chip">{n}</span>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {dist.fördelning.length === 0 && (
                    <div className="bmm-not-locked">Inga tips lämnade ännu</div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
