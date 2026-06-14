import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { matchStartMs } from '../components/MatchKort'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .pp-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  /* Back link */
  .pp-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 500; color: #888;
    text-decoration: none; margin-bottom: 1.25rem;
    transition: color 0.15s;
  }
  .pp-back:hover { color: #0a1628; }

  /* Hero card */
  .pp-hero {
    background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%);
    border-radius: 14px;
    padding: 1.75rem;
    margin-bottom: 1.25rem;
    position: relative;
    overflow: hidden;
  }
  .pp-hero::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 60% 80% at 90% 50%, rgba(197,160,40,0.07) 0%, transparent 60%);
  }
  .pp-hero-inner {
    display: flex; align-items: center; gap: 1.1rem; position: relative; z-index: 1;
  }
  .pp-avatar {
    width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0;
    background: rgba(197,160,40,0.15);
    border: 2px solid rgba(197,160,40,0.35);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #F0D060;
    overflow: hidden;
  }
  .pp-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .pp-hero-text {}
  .pp-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.3rem, 4vw, 1.7rem); font-weight: 700;
    color: #fff; letter-spacing: 0.02em; line-height: 1.1;
    margin-bottom: 2px;
  }
  .pp-meta {
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem; color: rgba(255,255,255,0.4);
  }

  /* Rekryteringsbadge in hero */
  .pp-rek-badge-hero {
    margin-left: auto; flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(197,160,40,0.15); border: 1px solid rgba(197,160,40,0.3);
    border-radius: 100px; padding: 4px 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 700; letter-spacing: .1em;
    color: #F0D060;
  }

  /* Stats row */
  .pp-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; margin-top: 1.25rem; padding-top: 1.25rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    position: relative; z-index: 1;
  }
  .pp-stat {
    text-align: center;
    border-right: 1px solid rgba(255,255,255,0.08);
    padding: 0 0.5rem;
  }
  .pp-stat:last-child { border-right: none; }
  .pp-stat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.7rem; font-weight: 700; line-height: 1;
    display: block; margin-bottom: 3px;
  }
  .pp-stat-val.points { color: #C8102E; }
  .pp-stat-val.neutral { color: #fff; }
  .pp-stat-lbl {
    font-family: 'Barlow', sans-serif;
    font-size: 0.65rem; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: rgba(255,255,255,0.35);
  }

  /* Locked banner */
  .pp-locked-banner {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(197,160,40,0.08); border: 1px solid rgba(197,160,40,0.25);
    border-radius: 10px; padding: 0.875rem 1rem; margin-bottom: 1.25rem;
    font-family: 'Barlow', sans-serif; font-size: 0.85rem;
    color: #7a5c10; line-height: 1.5;
  }

  /* Tabs */
  .pp-tabs {
    display: flex; gap: 0; margin-bottom: 1.25rem;
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 10px; overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .pp-tab {
    flex: 1; padding: 0.75rem 0.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.82rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase;
    background: transparent; border: none; cursor: pointer;
    color: #aaa; transition: all 0.15s;
    border-right: 1px solid rgba(0,0,0,0.06);
  }
  .pp-tab:last-child { border-right: none; }
  .pp-tab.active {
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
  }
  .pp-tab:not(.active):hover { background: #f8f7f4; color: #555; }

  /* Group header */
  .pp-group-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem;
  }
  .pp-group-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #0a1628; white-space: nowrap;
  }
  .pp-group-line { flex: 1; height: 1px; background: rgba(0,0,0,0.07); }
  .pp-group-summary {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
    color: #888; white-space: nowrap;
  }
  .pp-group-wrap { margin-bottom: 1.75rem; }

  /* Tip row */
  .pp-tip {
    display: flex; align-items: center;
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 0 8px 8px 0; border-left-width: 3px;
    padding: 0.55rem 0.875rem;
    margin-bottom: 0.4rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    gap: 8px;
  }
  .pp-tip.exact  { border-left-color: #C8102E; background: rgba(200,16,46,0.03); }
  .pp-tip.right  { border-left-color: #C5A028; background: rgba(197,160,40,0.03); }
  .pp-tip.wrong  { border-left-color: rgba(0,0,0,0.1); }
  .pp-tip.pending { border-left-color: rgba(0,0,0,0.06); background: #fafafa; opacity: 0.7; }

  .pp-tip-team {
    font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; font-weight: 500; color: #0a1628;
    flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pp-tip-team.home { text-align: right; }

  .pp-tip-score-wrap { text-align: center; flex-shrink: 0; min-width: 56px; }
  .pp-tip-score {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; color: #0a1628; line-height: 1;
  }
  .pp-tip-result {
    font-size: 0.65rem; color: #bbb; margin-top: 1px;
    font-family: 'Barlow', sans-serif;
  }

  .pp-tip-pts {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.82rem; font-weight: 700;
    min-width: 32px; text-align: right; flex-shrink: 0;
  }
  .pp-tip-pts.exact  { color: #C8102E; }
  .pp-tip-pts.right  { color: #8a6e1a; }
  .pp-tip-pts.wrong  { color: #ccc; }
  .pp-tip-pts.pending { color: #ddd; }

  /* Tips legend */
  .pp-legend {
    display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;
    flex-wrap: wrap;
  }
  .pp-legend-item {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Barlow', sans-serif; font-size: 0.72rem; color: #888;
  }
  .pp-legend-dot {
    width: 3px; height: 14px; border-radius: 0; flex-shrink: 0;
  }

  /* Answer cards */
  .pp-answer {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 0 8px 8px 0; border-left-width: 3px;
    padding: 0.875rem 1rem; margin-bottom: 0.5rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .pp-answer.correct { border-left-color: #C8102E; background: rgba(200,16,46,0.02); }
  .pp-answer.wrong   { border-left-color: rgba(0,0,0,0.1); }
  .pp-answer.pending { border-left-color: rgba(0,0,0,0.06); background: #fafafa; opacity: 0.75; }

  .pp-answer-nr {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.67rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #bbb; margin-bottom: 0.3rem;
  }
  .pp-answer-q {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; font-weight: 500; color: #0a1628;
    margin-bottom: 0.5rem; line-height: 1.4;
  }
  .pp-answer-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .pp-answer-a-wrap {
    display: flex; align-items: center; gap: 6px;
  }
  .pp-answer-arrow { font-size: 0.75rem; color: #ccc; }
  .pp-answer-a {
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem; color: #555;
  }
  .pp-answer-badge {
    display: inline-flex; align-items: center; gap: 4px;
    border-radius: 100px; padding: 2px 10px; flex-shrink: 0;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
  }
  .pp-answer-badge.correct {
    background: rgba(200,16,46,0.08); border: 1px solid rgba(200,16,46,0.2); color: #C8102E;
  }
  .pp-answer-badge.wrong {
    background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #bbb;
  }
  .pp-answer-badge.pending {
    background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); color: #ccc;
  }

  /* Wine card */
  .pp-wine-card {
    background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 12px;
    overflow: hidden; display: flex; align-items: stretch;
    margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,.04);
  }
  .pp-wine-img {
    width: 90px; flex-shrink: 0; background: #f8f7f4;
    display: flex; align-items: center; justify-content: center;
    border-right: 1px solid rgba(0,0,0,.06); padding: .875rem .75rem;
  }
  .pp-wine-img img { width: 100%; max-height: 100px; object-fit: contain; }
  .pp-wine-img-fallback { font-size: 2.2rem; opacity: .45; }
  .pp-wine-body { flex: 1; padding: .875rem 1rem; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .pp-wine-eyebrow { font-family: 'Barlow Condensed',sans-serif; font-size: .62rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #bbb; }
  .pp-wine-name { font-family: 'Barlow',sans-serif; font-size: .92rem; font-weight: 500; color: #0a1628; }
  .pp-wine-price { font-family: 'Barlow Condensed',sans-serif; font-size: .82rem; font-weight: 600; color: #C8102E; }
  .pp-wine-link { font-family: 'Barlow',sans-serif; font-size: .75rem; color: #C5A028; text-decoration: none; }
  .pp-wine-link:hover { text-decoration: underline; }

  /* Empty states */
  .pp-empty {
    text-align: center; padding: 3rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: 0.88rem; color: #bbb;
  }

  @media (max-width: 480px) {
    .pp-hero { padding: 1.25rem; }
    .pp-avatar { width: 48px; height: 48px; font-size: 1.2rem; }
    .pp-stat-val { font-size: 1.3rem; }
    .pp-stats { grid-template-columns: repeat(2, 1fr); gap: 0; }
    .pp-stat { padding: 0.5rem 0; }
    .pp-stat:nth-child(2) { border-right: none; }
    .pp-stat:nth-child(1), .pp-stat:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.08); }
    .pp-rek-badge-hero { display: none; }
  }
`

function tipClass(poäng) {
  if (poäng === 5) return 'pp-tip exact'
  if (poäng === 2) return 'pp-tip right'
  if (poäng === 0) return 'pp-tip wrong'
  return 'pp-tip pending'
}

function ptsClass(poäng) {
  if (poäng === 5) return 'pp-tip-pts exact'
  if (poäng === 2) return 'pp-tip-pts right'
  if (poäng === 0) return 'pp-tip-pts wrong'
  return 'pp-tip-pts pending'
}

function answerClass(svar, rätt_svar) {
  if (!rätt_svar) return 'pp-answer pending'
  return svar?.trim().toLowerCase() === rätt_svar.trim().toLowerCase()
    ? 'pp-answer correct'
    : 'pp-answer wrong'
}

function answerBadge(svar, rätt_svar) {
  if (!rätt_svar) return { cls: 'pending', label: 'PÅGÅR' }
  return svar?.trim().toLowerCase() === rätt_svar.trim().toLowerCase()
    ? { cls: 'correct', label: 'RÄTT' }
    : { cls: 'wrong', label: 'FEL' }
}

export default function ParticipantProfile() {
  const { user_id } = useParams()
  const [profil, setProfil] = useState(null)
  const [vin, setVin] = useState(null)
  const [placering, setPlacering] = useState(null)
  const [laddar, setLaddar] = useState(true)
  const [aktivFlik, setAktivFlik] = useState('tips')
  const { tipsLåst } = useSettings()

  useEffect(() => {
    Promise.all([
      fetch(`/.netlify/functions/participants?user_id=${user_id}`).then(r => r.json()),
      fetch('/.netlify/functions/viner-hamta').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/scores').then(r => r.json()).catch(() => []),
    ]).then(([profilData, vinerData, scoresData]) => {
      setProfil(profilData)
      if (Array.isArray(vinerData)) {
        const mitt = vinerData.find(v => v.user_id === user_id && v.vin_namn)
        setVin(mitt || null)
      }
      if (Array.isArray(scoresData)) {
        const rad = scoresData.find(r => r.user_id === user_id)
        if (rad) setPlacering(rad.plats)
      }
      setLaddar(false)
    })
  }, [user_id])

  if (laddar) {
    return <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>Laddar profil...</div>
  }

  if (!profil || profil.error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: '#888', marginBottom: '0.75rem' }}>Deltagaren hittades inte.</p>
        <Link to="/participants" style={{ color: '#C8102E', textDecoration: 'none', fontSize: '0.88rem' }}>
          ← Alla deltagare
        </Link>
      </div>
    )
  }

  const totalPoäng = profil.tips.reduce((sum, t) => sum + (t.poäng || 0), 0)
  const exakta = profil.tips.filter((t) => t.poäng === 5).length
  const rätta  = profil.tips.filter((t) => t.poäng === 2).length

  // Stabil, kronologisk ordning (samma för alla deltagare): matcher sorteras på
  // avsparkstid, grupperna på när deras första match spelas. Annars visas tipsen
  // i den ordning personen råkade lämna dem → olika ordning per deltagare.
  const kickoff = (tip) => matchStartMs(tip.datum, tip.tid) ?? Number.MAX_SAFE_INTEGER
  const grupperande = profil.tips.reduce((acc, tip) => {
    const g = tip.grupp || 'Övrigt'
    if (!acc[g]) acc[g] = []
    acc[g].push(tip)
    return acc
  }, {})
  Object.values(grupperande).forEach((tips) =>
    tips.sort((a, b) => kickoff(a) - kickoff(b) || String(a.match_id).localeCompare(String(b.match_id)))
  )
  const sorteradeGrupper = Object.entries(grupperande).sort(
    (a, b) =>
      Math.min(...a[1].map(kickoff)) - Math.min(...b[1].map(kickoff)) ||
      a[0].localeCompare(b[0], 'sv')
  )

  return (
    <>
      <style>{STYLES}</style>
      <div className="pp-wrap">

        <Link to="/participants" className="pp-back">
          ← Alla deltagare
        </Link>

        {/* Hero */}
        <div className="pp-hero">
          <div className="pp-hero-inner">
            <div className="pp-avatar">
              {vin?.bild_url
                ? <img src={vin.bild_url} alt={vin.vin_namn} />
                : profil.namn.charAt(0).toUpperCase()}
            </div>
            <div className="pp-hero-text">
              <h1 className="pp-name">{profil.namn}</h1>
              <p className="pp-meta">{profil.tips.length} tips lämnade</p>
            </div>
            {profil.rekryterade_antal > 0 && (
              <div className="pp-rek-badge-hero">
                👤 {profil.rekryterade_antal} rekryterad{profil.rekryterade_antal !== 1 ? 'e' : ''}
              </div>
            )}
          </div>

          {tipsLåst && (
            <div className="pp-stats">
              <div className="pp-stat">
                <span className="pp-stat-val points">{totalPoäng}</span>
                <span className="pp-stat-lbl">Poäng</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-val neutral">{exakta}</span>
                <span className="pp-stat-lbl">Exakta</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-val neutral">{rätta}</span>
                <span className="pp-stat-lbl">Rätta utgångar</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-val neutral">{placering ? `#${placering}` : '–'}</span>
                <span className="pp-stat-lbl">Placering</span>
              </div>
            </div>
          )}
        </div>

        {/* Wine card */}
        {vin && (
          <div className="pp-wine-card">
            <div className="pp-wine-img">
              {vin.bild_url
                ? <img src={vin.bild_url} alt={vin.vin_namn} />
                : <span className="pp-wine-img-fallback">🍷</span>}
            </div>
            <div className="pp-wine-body">
              <span className="pp-wine-eyebrow">Vald vinflaska</span>
              <span className="pp-wine-name">{vin.vin_namn}</span>
              {vin.vin_pris && <span className="pp-wine-price">{vin.vin_pris} kr</span>}
              {vin.vin_url && (
                <a href={vin.vin_url} target="_blank" rel="noopener noreferrer" className="pp-wine-link" onClick={e => e.stopPropagation()}>
                  Visa på Systembolaget →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {tipsLåst ? (
          <>
            {/* Tabs */}
            <div className="pp-tabs">
              <button
                className={`pp-tab ${aktivFlik === 'tips' ? 'active' : ''}`}
                onClick={() => setAktivFlik('tips')}
              >
                Tips ({profil.tips.length})
              </button>
              <button
                className={`pp-tab ${aktivFlik === 'svar' ? 'active' : ''}`}
                onClick={() => setAktivFlik('svar')}
              >
                Tilläggsfrågor ({profil.svar.length})
              </button>
            </div>

            {/* Tips tab */}
            {aktivFlik === 'tips' && (
              <div>
                {profil.tips.length === 0 ? (
                  <div className="pp-empty">Inga tips lämnade.</div>
                ) : (
                  <>
                    {sorteradeGrupper.map(([grupp, tips]) => {
                      const gruppPoäng = tips.reduce((s, t) => s + (t.poäng || 0), 0)
                      const gruppExakta = tips.filter(t => t.poäng === 5).length
                      const harPoäng = tips.some(t => t.poäng !== null)

                      return (
                        <div key={grupp} className="pp-group-wrap">
                          <div className="pp-group-header">
                            <span className="pp-group-title">{grupp}</span>
                            <div className="pp-group-line" />
                            {harPoäng && (
                              <span className="pp-group-summary">
                                +{gruppPoäng}p{gruppExakta > 0 ? ` · ${gruppExakta} exakta` : ''}
                              </span>
                            )}
                          </div>
                          {tips.map((tip) => (
                            <div key={tip.match_id} className={tipClass(tip.poäng)}>
                              <span className="pp-tip-team home">{tip.hemmalag}</span>
                              <div className="pp-tip-score-wrap">
                                <div className="pp-tip-score">
                                  {tip.tip_hemma} – {tip.tip_borta}
                                </div>
                                {tip.resultat_hemma !== null && (
                                  <div className="pp-tip-result">
                                    {tip.resultat_hemma}–{tip.resultat_borta}
                                  </div>
                                )}
                              </div>
                              <span className="pp-tip-team">{tip.bortalag}</span>
                              {tip.poäng !== null && (
                                <span className={ptsClass(tip.poäng)}>
                                  {tip.poäng > 0 ? `+${tip.poäng}p` : '0p'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}

                    <div className="pp-legend">
                      <div className="pp-legend-item">
                        <div className="pp-legend-dot" style={{ background: '#C8102E' }} />
                        Exakt resultat (+5p)
                      </div>
                      <div className="pp-legend-item">
                        <div className="pp-legend-dot" style={{ background: '#C5A028' }} />
                        Rätt utgång (+2p)
                      </div>
                      <div className="pp-legend-item">
                        <div className="pp-legend-dot" style={{ background: 'rgba(0,0,0,0.15)' }} />
                        Fel / ej spelad
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Answers tab */}
            {aktivFlik === 'svar' && (
              <div>
                {profil.svar.length === 0 ? (
                  <div className="pp-empty">Inga svar lämnade.</div>
                ) : (
                  [...profil.svar].sort((a, b) => (a.fråga_nr ?? 999) - (b.fråga_nr ?? 999)).map((s) => {
                    const badge = answerBadge(s.svar, s.rätt_svar)
                    return (
                      <div key={s.fråga_id} className={answerClass(s.svar, s.rätt_svar)}>
                        {s.fråga_nr && (
                          <div className="pp-answer-nr">Fråga {s.fråga_nr}</div>
                        )}
                        {s.fråga && (
                          <div className="pp-answer-q">{s.fråga}</div>
                        )}
                        <div className="pp-answer-row">
                          <div className="pp-answer-a-wrap">
                            <span className="pp-answer-arrow">→</span>
                            <span className="pp-answer-a">{s.svar}</span>
                          </div>
                          <div className={`pp-answer-badge ${badge.cls}`}>
                            {badge.cls === 'correct' && '✓ '}
                            {badge.cls === 'wrong' && '✗ '}
                            {badge.label}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <div className="pp-locked-banner">
            <span>🔒</span>
            <span>Tips och tilläggsfrågor visas när tävlingen är låst.</span>
          </div>
        )}

      </div>
    </>
  )
}
