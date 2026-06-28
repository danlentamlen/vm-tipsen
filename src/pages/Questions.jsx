import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useLanguage } from '../context/LanguageContext'
import DistributionModal from '../components/DistributionModal'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .q-wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .q-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem; }
  .q-title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700; color: #0a1628; letter-spacing: 0.02em; line-height: 1; margin-bottom: 0.5rem; }
  .q-subtitle { font-family: 'Barlow', sans-serif; font-size: 0.9rem; color: #888; margin-bottom: 1.75rem; }

  .q-banner { display: flex; align-items: flex-start; gap: 10px; padding: 0.875rem 1.1rem; border-radius: 10px; margin-bottom: 1.25rem; font-family: 'Barlow', sans-serif; font-size: 0.88rem; line-height: 1.5; }
  .q-banner-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
  .q-banner.warning { background: rgba(197,160,40,0.1); border: 1px solid rgba(197,160,40,0.3); color: #7a5e10; }
  .q-banner.locked  { background: rgba(200,16,46,0.07); border: 1px solid rgba(200,16,46,0.2); color: #8a1020; }

  .q-card { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; padding: 1.4rem 1.5rem; margin-bottom: 0.875rem; transition: box-shadow 0.15s, border-color 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .q-card.clickable { cursor: pointer; }
  .q-card.clickable:hover { border-color: rgba(197,160,40,0.5); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .q-card.answered { border-left: 3px solid #28a055; background: linear-gradient(to right, rgba(40,160,85,0.03), #fff 60px); }

  .q-answered-badge { display:inline-flex; align-items:center; gap:4px; font-family:'Barlow Condensed',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(40,160,85,0.12); color:#1a7a40; border:1px solid rgba(40,160,85,0.25); padding:3px 8px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
  .q-unanswered-badge { display:inline-flex; align-items:center; gap:4px; font-family:'Barlow Condensed',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(200,16,46,0.06); color:#C8102E; border:1px solid rgba(200,16,46,0.15); padding:3px 8px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
  .q-rätt-badge  { display:inline-flex; align-items:center; gap:4px; font-family:'Barlow Condensed',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(26,122,53,0.12); color:#1a7a35; border:1px solid rgba(26,122,53,0.3); padding:3px 8px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
  .q-fel-badge   { display:inline-flex; align-items:center; gap:4px; font-family:'Barlow Condensed',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(200,16,46,0.08); color:#C8102E; border:1px solid rgba(200,16,46,0.2); padding:3px 8px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
  .q-card.rätt { border-left-color: #1a7a35; background: linear-gradient(to right, rgba(26,122,53,0.04), #fff 60px); }
  .q-card.fel   { border-left-color: #C8102E; background: linear-gradient(to right, rgba(200,16,46,0.04), #fff 60px); }

  .q-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
  .q-question { font-family: 'Barlow', sans-serif; font-size: 0.98rem; font-weight: 500; color: #0a1628; line-height: 1.5; flex: 1; }
  .q-points-badge { font-family: 'Barlow Condensed', sans-serif; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; background: linear-gradient(135deg, #0a1628, #1a2e4a); color: #F0D060; padding: 4px 10px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }

  .q-answer-display { background: #f8f7f4; border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; }
  .q-answer-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #aaa; margin-bottom: 2px; }
  .q-answer-value { font-family: 'Barlow', sans-serif; font-size: 0.95rem; font-weight: 500; color: #0a1628; }
  .q-lock-icon { font-size: 0.9rem; color: #ccc; }

  .q-choices { display: flex; flex-wrap: wrap; gap: 8px; }
  .q-choice-btn { font-family: 'Barlow', sans-serif; font-size: 0.88rem; font-weight: 500; padding: 8px 18px; border-radius: 8px; border: 1.5px solid rgba(0,0,0,0.12); background: #fff; color: #444; cursor: pointer; transition: all 0.15s; }
  .q-choice-btn:hover:not(:disabled) { border-color: #C5A028; color: #0a1628; }
  .q-choice-btn.selected { background: linear-gradient(135deg, #0a1628, #1a2e4a); color: #F0D060; border-color: transparent; }
  .q-saved-inline { font-family: 'Barlow', sans-serif; font-size: 0.8rem; color: #4a8a5a; font-weight: 600; }

  .q-input-row { display: flex; gap: 8px; align-items: center; }
  .q-input { flex: 1; font-family: 'Barlow', sans-serif; font-size: 0.9rem; padding: 9px 13px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px; outline: none; transition: border-color 0.15s; background: #fff; color: #0a1628; }
  .q-input:focus { border-color: #C5A028; }

  .q-save-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 9px 16px; border-radius: 8px; border: none; cursor: pointer; transition: opacity 0.15s; white-space: nowrap; flex-shrink: 0; }
  .q-save-btn.default { background: #0a1628; color: #F0D060; }
  .q-save-btn.update  { background: rgba(197,160,40,0.15); color: #7a5e10; border: 1px solid rgba(197,160,40,0.3); }
  .q-save-btn.saved   { background: rgba(34,120,60,0.12); color: #1a6b35; border: 1px solid rgba(34,120,60,0.25); }
  .q-save-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .q-team-wrap { position: relative; flex: 1; }
  .q-team-trigger { width: 100%; display: flex; justify-content: space-between; align-items: center; font-family: 'Barlow', sans-serif; font-size: 0.9rem; padding: 9px 13px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 8px; background: #fff; color: #0a1628; cursor: pointer; text-align: left; }
  .q-team-trigger.placeholder { color: #aaa; }
  .q-team-dropdown { position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); overflow: hidden; }
  .q-team-search { padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .q-team-search input { width: 100%; font-family: 'Barlow', sans-serif; font-size: 0.85rem; padding: 7px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; outline: none; }
  .q-team-list { max-height: 200px; overflow-y: auto; }
  .q-team-item { padding: 9px 14px; font-family: 'Barlow', sans-serif; font-size: 0.88rem; cursor: pointer; color: #333; transition: background 0.1s; }
  .q-team-item:hover { background: rgba(197,160,40,0.08); }
  .q-team-item.active { background: rgba(197,160,40,0.12); color: #0a1628; font-weight: 500; }
  .q-team-empty { padding: 10px 14px; font-size: 0.85rem; color: #aaa; }

  .q-progress-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .q-progress-bar { flex: 1; height: 4px; background: rgba(0,0,0,0.07); border-radius: 2px; overflow: hidden; }
  .q-progress-fill { height: 100%; background: linear-gradient(90deg, #C8102E, #C5A028); border-radius: 2px; transition: width 0.4s ease; }
  .q-progress-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; color: #aaa; white-space: nowrap; }
`

export default function Questions() {
  const [frågor, setFrågor]       = useState([])
  const [lag, setLag]             = useState([])
  const [laddar, setLaddar]       = useState(true)
  const [sparar, setSparar]       = useState(null)
  const [sparat, setSparat]       = useState({})
  const [valdFråga, setValdFråga] = useState(null)
  const { användare }             = useAuth()
  const { tipsLåst }              = useSettings()
  const { t, språk }              = useLanguage()

  useEffect(() => { hämtaAllt() }, [användare])

  async function hämtaAllt() {
    const headers = {}
    if (användare) headers.Authorization = `Bearer ${användare.token}`

    const [frågorRes, matcherRes] = await Promise.all([
      fetch('/.netlify/functions/questions', { headers }),
      fetch('/.netlify/functions/matches'),
    ])
    const frågorData  = await frågorRes.json()
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
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
        {t('questions.laddar')}
      </div>
    )
  }

  if (frågor.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>❓</p>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', marginBottom: '0.5rem' }}>
          {t('questions.ingenFrågor.titel')}
        </h2>
        <p style={{ color: '#888' }}>{t('questions.ingenFrågor.beskr')}</p>
      </div>
    )
  }

  const besvarade = frågor.filter((f) => !!f.mitt_svar).length
  const progress  = Math.round((besvarade / frågor.length) * 100)

  return (
    <>
      <style>{STYLES}</style>
      <div className="q-wrap">
        <p className="q-eyebrow">{t('questions.eyebrow')}</p>
        <h2 className="q-title">{t('questions.titel')}</h2>
        <p className="q-subtitle">{t('questions.subtitle')}</p>

        {användare && (
          <div className="q-progress-wrap">
            <div className="q-progress-bar">
              <div className="q-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="q-progress-label">
              {t('questions.besvarade', { antal: besvarade, total: frågor.length })}
            </span>
          </div>
        )}

        {!användare && (
          <div className="q-banner warning">
            <span className="q-banner-icon">🔑</span>
            <span>
              <Link to="/login" style={{ color: '#7a5e10', fontWeight: 600 }}>
                {t('navbar.loggaIn')}
              </Link>
              {' '}{t('questions.loggaInFörSvar')}
            </span>
          </div>
        )}
        {användare && tipsLåst && (
          <div className="q-banner locked">
            <span className="q-banner-icon">🔒</span>
            <span>{t('questions.låstBanner')}</span>
          </div>
        )}

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
              t={t}
              språk={språk}
            />
          ))}
        </div>

        {valdFråga && (
          <DistributionModal
            typ="fråga"
            id={valdFråga.fråga_id}
            titel={(språk === 'en' && valdFråga.fråga_en) ? valdFråga.fråga_en : valdFråga.fråga}
            onStäng={() => setValdFråga(null)}
          />
        )}
      </div>
    </>
  )
}

function FrågeKort({ fråga, lag, inloggad, tipsLåst, sparar, nySparad, onSpara, onKlick, t, språk }) {
  const [svar, setSvar] = useState(fråga.mitt_svar || '')

  useEffect(() => { setSvar(fråga.mitt_svar || '') }, [fråga.mitt_svar])

  const harSvarat     = !!fråga.mitt_svar
  const rättSvarVisat = fråga.har_rätt_svar
  const ärRätt        = fråga.är_rätt  // true | false | null

  // Frågetext — visa på rätt språk
  const frågetext = (språk === 'en' && fråga.fråga_en) ? fråga.fråga_en : fråga.fråga

  // Typ bestäms alltid av den SVENSKA typen — det är den som matchar rätt_svar i sheetet
  const svTyp    = fråga.typ   // t.ex. "choice:Ja/Nej"
  const enTyp    = fråga.typ_en // t.ex. "choice:Yes/No" — bara för visning

  const ärChoice = svTyp?.startsWith('choice')
  const ärNumber = svTyp === 'number'
  const ärTeam   = svTyp === 'team'

  // Bygg en mappning: engelskt alternativ → svenskt alternativ
  // så att vi alltid sparar det svenska värdet i sheetet
  // Exempel: { "Yes": "Ja", "No": "Nej" }
  const enTillSv = {}
  const svTillEn = {}
  if (ärChoice && språk === 'en' && enTyp) {
    const svAlternativ = svTyp.split(':')[1]?.split('/') || []
    const enAlternativ = enTyp.split(':')[1]?.split('/') || []
    svAlternativ.forEach((sv, i) => {
      if (enAlternativ[i]) {
        enTillSv[enAlternativ[i]] = sv
        svTillEn[sv] = enAlternativ[i]
      }
    })
  }

  // Alternativ att VISA — engelska om tillgängligt, annars svenska
  const visningsAlternativ = ärChoice
    ? (språk === 'en' && enTyp
        ? enTyp.split(':')[1]?.split('/') || []
        : svTyp.split(':')[1]?.split('/') || [])
    : []

  // Det sparade svaret är alltid på svenska — översätt till engelska för visning
  const visSvar = (språk === 'en' && svar && svTillEn[svar]) ? svTillEn[svar] : svar

  function sparaChoice(valtVisningsAlternativ) {
    // Mappa tillbaka till svenska innan vi sparar
    const spara = (språk === 'en' && enTillSv[valtVisningsAlternativ])
      ? enTillSv[valtVisningsAlternativ]
      : valtVisningsAlternativ
    setSvar(spara)
    onSpara(fråga.fråga_id, spara)
  }

  function renderInput() {
    if (rättSvarVisat || tipsLåst) {
      return (
        <div className="q-answer-display">
          <div>
            <div className="q-answer-label">{t('questions.dittSvar')}</div>
            {/* Visa sparad svar på rätt språk */}
            <div className="q-answer-value">{visSvar || '–'}</div>
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
            t={t}
          />
        </div>
      )
    }

    if (ärChoice) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="q-choices">
            {visningsAlternativ.map((alt) => {
              // Markera som valt om det engelska alternativet matchar det sparade svenska svaret
              const ärValt = alt === visSvar
              return (
                <button
                  key={alt}
                  onClick={() => sparaChoice(alt)}
                  disabled={sparar}
                  className={`q-choice-btn ${ärValt ? 'selected' : ''}`}
                >
                  {alt}
                </button>
              )
            })}
          </div>
          {nySparad && (
            <span className="q-saved-inline" style={{ display: 'block', marginTop: 8 }}>
              {t('questions.sparat')}
            </span>
          )}
        </div>
      )
    }

    // text / number
    return (
      <div className="q-input-row" onClick={(e) => e.stopPropagation()}>
        <input
          type={ärNumber ? 'number' : 'text'}
          min={ärNumber ? 0 : undefined}
          value={svar}
          onChange={(e) => setSvar(e.target.value)}
          placeholder={ärNumber ? t('questions.angeEttTal') : t('questions.dittSvarPlaceholder')}
          className="q-input"
        />
        <button
          onClick={() => onSpara(fråga.fråga_id, svar)}
          disabled={sparar || !svar.toString().trim()}
          className={`q-save-btn ${nySparad ? 'saved' : harSvarat ? 'update' : 'default'}`}
        >
          {sparar
            ? t('questions.sparar')
            : nySparad
              ? t('questions.sparat')
              : harSvarat
                ? t('questions.uppdatera')
                : t('questions.spara')}
        </button>
      </div>
    )
  }

  // Kortets kantfärg — rätt/fel slår igenom om känt, annars grön om besvarat
  const kortKlass = ärRätt === true
    ? 'answered rätt'
    : ärRätt === false
      ? 'answered fel'
      : harSvarat ? 'answered' : ''

  return (
    <div
      className={`q-card ${onKlick ? 'clickable' : ''} ${kortKlass}`}
      onClick={onKlick || undefined}
    >
      <div className="q-card-top">
        <p className="q-question">{frågetext}</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span className="q-points-badge">{fråga.poäng}p</span>
          {inloggad && ärRätt === true  && <span className="q-rätt-badge">✅ Rätt! +{fråga.poäng}p</span>}
          {inloggad && ärRätt === false && <span className="q-fel-badge">❌ Fel</span>}
          {inloggad && ärRätt === null && (
            harSvarat
              ? <span className="q-answered-badge">✓ {t('questions.sparat') || 'Sparat'}</span>
              : !tipsLåst && <span className="q-unanswered-badge">! {t('questions.ej_besvarat') || 'Ej besvarat'}</span>
          )}
        </div>
      </div>
      {renderInput()}
    </div>
  )
}

function TeamVäljare({ lag, värde, onChange, onSpara, sparar, nySparad, harSvarat, t }) {
  const [sök, setSök]     = useState('')
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
          <span>{värde || t('questions.väljaLag')}</span>
          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{öppen ? '▲' : '▼'}</span>
        </button>
        {öppen && (
          <div className="q-team-dropdown">
            <div className="q-team-search">
              <input
                type="text"
                value={sök}
                onChange={(e) => setSök(e.target.value)}
                placeholder={t('questions.sökLag')}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="q-team-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtrerade.length === 0 ? (
                <li className="q-team-empty">{t('questions.ingaLag')}</li>
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
        {sparar
          ? t('questions.sparar')
          : nySparad
            ? t('questions.sparat')
            : harSvarat
              ? t('questions.uppdatera')
              : t('questions.spara')}
      </button>
    </div>
  )
}