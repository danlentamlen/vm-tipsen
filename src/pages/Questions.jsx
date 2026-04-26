import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import DistributionModal from '../components/DistributionModal'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .q-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }
  .q-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #C8102E;
    margin-bottom: 0.3rem;
  }
  .q-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem);
    font-weight: 700;
    color: #0a1628;
    letter-spacing: 0.02em;
    line-height: 1;
    margin-bottom: 0.5rem;
  }
  .q-subtitle {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    color: #888;
    margin-bottom: 1.75rem;
  }

  /* Banners */
  .q-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0.875rem 1.1rem;
    border-radius: 10px;
    margin-bottom: 1.25rem;
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem;
    line-height: 1.5;
  }
  .q-banner-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
  .q-banner.warning {
    background: rgba(197,160,40,0.1);
    border: 1px solid rgba(197,160,40,0.3);
    color: #7a5e10;
  }
  .q-banner.locked {
    background: rgba(200,16,46,0.07);
    border: 1px solid rgba(200,16,46,0.2);
    color: #8a1020;
  }

  /* Cards */
  .q-card {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px;
    padding: 1.4rem 1.5rem;
    margin-bottom: 0.875rem;
    transition: box-shadow 0.15s, border-color 0.15s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .q-card.clickable {
    cursor: pointer;
  }
  .q-card.clickable:hover {
    border-color: rgba(197,160,40,0.5);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .q-card.answered {
    border-left: 3px solid #C5A028;
  }

  .q-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .q-question {
    font-family: 'Barlow', sans-serif;
    font-size: 0.98rem;
    font-weight: 500;
    color: #0a1628;
    line-height: 1.5;
    flex: 1;
  }
  .q-points-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Answered display */
  .q-answer-display {
    background: #f8f7f4;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .q-answer-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #aaa;
    margin-bottom: 2px;
  }
  .q-answer-value {
    font-family: 'Barlow', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    color: #0a1628;
  }
  .q-lock-icon { font-size: 0.9rem; color: #ccc; }

  /* Choice buttons */
  .q-choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .q-choice-btn {
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem;
    font-weight: 500;
    padding: 8px 18px;
    border-radius: 8px;
    border: 1.5px solid rgba(0,0,0,0.12);
    background: #fff;
    color: #444;
    cursor: pointer;
    transition: all 0.15s;
  }
  .q-choice-btn:hover:not(:disabled) {
    border-color: #C5A028;
    color: #0a1628;
  }
  .q-choice-btn.selected {
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
    border-color: transparent;
  }
  .q-choice-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Text/number input row */
  .q-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .q-input {
    flex: 1;
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    padding: 9px 14px;
    border: 1.5px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    background: #fff;
    color: #0a1628;
    outline: none;
    transition: border-color 0.15s;
  }
  .q-input:focus { border-color: #C5A028; }

  /* Save button */
  .q-save-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 9px 18px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .q-save-btn.default {
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
  }
  .q-save-btn.default:hover:not(:disabled) { opacity: 0.88; }
  .q-save-btn.update {
    background: #f0ede6;
    color: #666;
  }
  .q-save-btn.update:hover:not(:disabled) { background: #e8e4dc; }
  .q-save-btn.saved {
    background: rgba(197,160,40,0.15);
    color: #8a6e1a;
    border: 1px solid rgba(197,160,40,0.3);
  }
  .q-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .q-saved-inline {
    font-size: 0.8rem;
    color: #8a6e1a;
    font-family: 'Barlow', sans-serif;
    align-self: center;
  }

  /* Team picker */
  .q-team-wrap { position: relative; flex: 1; }
  .q-team-trigger {
    width: 100%;
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    padding: 9px 14px;
    border: 1.5px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    background: #fff;
    color: #0a1628;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.15s;
    text-align: left;
  }
  .q-team-trigger:hover { border-color: #C5A028; }
  .q-team-trigger.placeholder { color: #aaa; }
  .q-team-dropdown {
    position: absolute;
    z-index: 20;
    top: calc(100% + 4px);
    left: 0; right: 0;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    overflow: hidden;
  }
  .q-team-search {
    padding: 8px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .q-team-search input {
    width: 100%;
    font-family: 'Barlow', sans-serif;
    font-size: 0.85rem;
    padding: 7px 10px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 6px;
    outline: none;
  }
  .q-team-list { max-height: 200px; overflow-y: auto; }
  .q-team-item {
    padding: 9px 14px;
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem;
    cursor: pointer;
    color: #333;
    transition: background 0.1s;
  }
  .q-team-item:hover { background: rgba(197,160,40,0.08); }
  .q-team-item.active { background: rgba(197,160,40,0.12); color: #0a1628; font-weight: 500; }
  .q-team-empty { padding: 10px 14px; font-size: 0.85rem; color: #aaa; }

  /* Progress bar */
  .q-progress-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1.5rem;
  }
  .q-progress-bar {
    flex: 1;
    height: 4px;
    background: rgba(0,0,0,0.07);
    border-radius: 2px;
    overflow: hidden;
  }
  .q-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #C8102E, #C5A028);
    border-radius: 2px;
    transition: width 0.4s ease;
  }
  .q-progress-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: #aaa;
    white-space: nowrap;
  }
`

export default function Questions() {
  const [frågor, setFrågor] = useState([])
  const [lag, setLag] = useState([])
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [sparat, setSparat] = useState({})
  const [valdFråga, setValdFråga] = useState(null)
  const { användare } = useAuth()
  const { tipsLåst } = useSettings()

  useEffect(() => { hämtaAllt() }, [användare])

  async function hämtaAllt() {
    const headers = {}
    if (användare) headers.Authorization = `Bearer ${användare.token}`

    const [frågorRes, matcherRes] = await Promise.all([
      fetch('/.netlify/functions/questions', { headers }),
      fetch('/.netlify/functions/matches'),
    ])
    const frågorData = await frågorRes.json()
    const matcherData = await matcherRes.json()

    const lagSet = new Set()
    matcherData.forEach((match) => {
      const ärRiktigt = (namn) => namn && !/^[0-9WL]/.test(namn)
      if (ärRiktigt(match.hemmalag)) lagSet.add(match.hemmalag)
      if (ärRiktigt(match.bortalag)) lagSet.add(match.bortalag)
    })

    setFrågor(frågorData)
    setLag([...lagSet].sort())
    setLaddar(false)
  }

  async function sparaSvar(fråga_id, svar) {
    if (!användare || !svar.toString().trim()) return
    setSparar(fråga_id)
    await fetch('/.netlify/functions/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${användare.token}`,
      },
      body: JSON.stringify({ fråga_id, svar }),
    })
    setSparat((prev) => ({ ...prev, [fråga_id]: true }))
    setSparar(null)
    setTimeout(() => setSparat((prev) => ({ ...prev, [fråga_id]: false })), 2000)
    hämtaAllt()
  }

  if (laddar) {
    return <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>Laddar frågor...</div>
  }

  if (frågor.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>❓</p>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', marginBottom: '0.5rem' }}>Inga frågor än</h2>
        <p style={{ color: '#888' }}>Frågorna publiceras innan VM startar.</p>
      </div>
    )
  }

  const besvarade = frågor.filter((f) => !!f.mitt_svar).length
  const progress = Math.round((besvarade / frågor.length) * 100)

  return (
    <>
      <style>{STYLES}</style>
      <div className="q-wrap">
        <p className="q-eyebrow">VM-tipsen 2026</p>
        <h2 className="q-title">Tilläggsfrågor</h2>
        <p className="q-subtitle">Svara på frågorna innan VM startar — rätt svar ger bonuspoäng!</p>

        {/* Progress */}
        {användare && (
          <div className="q-progress-wrap">
            <div className="q-progress-bar">
              <div className="q-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="q-progress-label">{besvarade} / {frågor.length} besvarade</span>
          </div>
        )}

        {/* Banners */}
        {!användare && (
          <div className="q-banner warning">
            <span className="q-banner-icon">🔑</span>
            <span><Link to="/login" style={{ color: '#7a5e10', fontWeight: 600 }}>Logga in</Link> för att svara på frågorna!</span>
          </div>
        )}
        {användare && tipsLåst && (
          <div className="q-banner locked">
            <span className="q-banner-icon">🔒</span>
            <span>Frågorna är låsta — du kan inte längre ändra dina svar. Klicka på en fråga för att se svarsfördelningen.</span>
          </div>
        )}

        {/* Fråge-kort */}
        <div>
          {frågor.map((f) => (
            <FrågeKort
              key={f.fråga_id}
              fråga={f}
              lag={lag}
              inloggad={!!användare}
              tipsLåst={tipsLåst}
              sparar={sparar === f.fråga_id}
              nySparad={sparat[f.fråga_id]}
              onSpara={sparaSvar}
              onKlick={tipsLåst ? () => setValdFråga(f) : null}
            />
          ))}
        </div>

        {valdFråga && (
          <DistributionModal
            typ="fråga"
            id={valdFråga.fråga_id}
            titel={valdFråga.fråga}
            onStäng={() => setValdFråga(null)}
          />
        )}
      </div>
    </>
  )
}

function FrågeKort({ fråga, lag, inloggad, tipsLåst, sparar, nySparad, onSpara, onKlick }) {
  const [svar, setSvar] = useState(fråga.mitt_svar || '')

  useEffect(() => { setSvar(fråga.mitt_svar || '') }, [fråga.mitt_svar])

  const harSvarat = !!fråga.mitt_svar
  const rättSvarVisat = fråga.har_rätt_svar
  const ärChoice = fråga.typ?.startsWith('choice')
  const ärNumber = fråga.typ === 'number'
  const ärTeam = fråga.typ === 'team'
  const alternativ = ärChoice ? fråga.typ.split(':')[1]?.split('/') || [] : []

  function renderInput() {
    if (rättSvarVisat || tipsLåst) {
      return (
        <div className="q-answer-display">
          <div>
            <div className="q-answer-label">Ditt svar</div>
            <div className="q-answer-value">{fråga.mitt_svar || '–'}</div>
          </div>
          {tipsLåst && <span className="q-lock-icon">🔒</span>}
        </div>
      )
    }

    if (!inloggad) return null

    if (ärTeam) {
      return (
        <div className="q-input-row" onClick={(e) => e.stopPropagation()}>
          <TeamVäljare
            lag={lag}
            värde={svar}
            onChange={setSvar}
            onSpara={(valt) => onSpara(fråga.fråga_id, valt || svar)}
            sparar={sparar}
            nySparad={nySparad}
            harSvarat={harSvarat}
          />
        </div>
      )
    }

    if (ärChoice) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="q-choices">
            {alternativ.map((alt) => (
              <button
                key={alt}
                onClick={() => { setSvar(alt); onSpara(fråga.fråga_id, alt) }}
                disabled={sparar}
                className={`q-choice-btn ${svar === alt ? 'selected' : ''}`}
              >
                {alt}
              </button>
            ))}
          </div>
          {nySparad && <span className="q-saved-inline" style={{ display: 'block', marginTop: 8 }}>✓ Sparat!</span>}
        </div>
      )
    }

    return (
      <div className="q-input-row" onClick={(e) => e.stopPropagation()}>
        <input
          type={ärNumber ? 'number' : 'text'}
          min={ärNumber ? 0 : undefined}
          value={svar}
          onChange={(e) => setSvar(e.target.value)}
          placeholder={ärNumber ? 'Ange ett tal...' : 'Ditt svar...'}
          className="q-input"
        />
        <button
          onClick={() => onSpara(fråga.fråga_id, svar)}
          disabled={sparar || !svar.toString().trim()}
          className={`q-save-btn ${nySparad ? 'saved' : harSvarat ? 'update' : 'default'}`}
        >
          {sparar ? '...' : nySparad ? '✓ Sparat!' : harSvarat ? 'Uppdatera' : 'Spara'}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`q-card ${onKlick ? 'clickable' : ''} ${harSvarat ? 'answered' : ''}`}
      onClick={onKlick || undefined}
    >
      <div className="q-card-top">
        <p className="q-question">{fråga.fråga}</p>
        <span className="q-points-badge">{fråga.poäng}p</span>
      </div>
      {renderInput()}
    </div>
  )
}

function TeamVäljare({ lag, värde, onChange, onSpara, sparar, nySparad, harSvarat }) {
  const [sök, setSök] = useState('')
  const [öppen, setÖppen] = useState(false)

  const filtrerade = lag.filter((l) => l.toLowerCase().includes(sök.toLowerCase()))

  function välj(valtLag) {
    onChange(valtLag)
    setSök('')
    setÖppen(false)
    onSpara(valtLag)
  }

  return (
    <div className="q-input-row" style={{ width: '100%' }}>
      <div className="q-team-wrap">
        <button
          type="button"
          className={`q-team-trigger ${!värde ? 'placeholder' : ''}`}
          onClick={() => setÖppen(!öppen)}
        >
          <span>{värde || 'Välj ett lag...'}</span>
          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{öppen ? '▲' : '▼'}</span>
        </button>
        {öppen && (
          <div className="q-team-dropdown">
            <div className="q-team-search">
              <input
                type="text"
                value={sök}
                onChange={(e) => setSök(e.target.value)}
                placeholder="Sök lag..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="q-team-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtrerade.length === 0 ? (
                <li className="q-team-empty">Inga lag hittades</li>
              ) : (
                filtrerade.map((l) => (
                  <li
                    key={l}
                    onClick={() => välj(l)}
                    className={`q-team-item ${l === värde ? 'active' : ''}`}
                  >
                    {l}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      <button
        onClick={() => onSpara(värde)}
        disabled={sparar || !värde}
        className={`q-save-btn ${nySparad ? 'saved' : harSvarat ? 'update' : 'default'}`}
      >
        {sparar ? '...' : nySparad ? '✓ Sparat!' : harSvarat ? 'Uppdatera' : 'Spara'}
      </button>
    </div>
  )
}