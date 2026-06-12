import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLås } from '../hooks/useLås'
import { useLanguage } from '../context/LanguageContext'
import MatchKort, { normName, getFlag, MATCH_KORT_STYLES, dagOffset, matchStartMs } from '../components/MatchKort'

function formatDatum(datum, språk) {
  if (!datum) return ''
  try {
    const d = new Date(datum)
    const locale = språk === 'en' ? 'en-GB' : 'sv-SE'
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return datum }
}

/** Justerar matchens datum om CEST-konverteringen korsar midnatt (dagOffset = +1). */
function adjustedDatum(match) {
  const offset = dagOffset(match.tid)
  if (offset === 0 || !match.datum) return match.datum || 'Okänt datum'
  try {
    const d = new Date(match.datum)
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
  } catch { return match.datum }
}

/** Kronologisk sortering på absolut avsparkstid (UTC). Matcher utan tolkbar tid sist. */
function efterStarttid(a, b) {
  const ma = matchStartMs(a.datum, a.tid)
  const mb = matchStartMs(b.datum, b.tid)
  if (ma == null && mb == null) return 0
  if (ma == null) return 1
  if (mb == null) return -1
  return ma - mb
}

/** Returnerar en ny datum→matcher-karta med datumen i kronologisk ordning och
 *  matcherna inom varje dag sorterade på faktisk avsparkstid. */
function ordnaDagar(datumMap) {
  const sorterad = {}
  Object.keys(datumMap)
    .sort((a, b) => a.localeCompare(b))
    .forEach((d) => { sorterad[d] = [...datumMap[d]].sort(efterStarttid) })
  return sorterad
}

const SLUTSPELS_ORDNING = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

function ärSlutspel(m) {
  return m.grupp === 'Slutspel'
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&display=swap');

  .m-wrap { max-width:760px; margin:0 auto; padding:2rem 1rem 4rem; }
  .m-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .m-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.25rem; }

  .m-info-box { background:linear-gradient(135deg,rgba(10,22,40,.04),rgba(10,22,40,.02)); border:1px solid rgba(10,22,40,.1); border-left:3px solid #0a1628; border-radius:10px; padding:.875rem 1.1rem; margin-bottom:1.5rem; font-family:'Barlow',sans-serif; font-size:.85rem; color:#444; line-height:1.6; }
  .m-info-box strong { color: #0a1628; }
  .m-banner { display:flex; align-items:flex-start; gap:10px; padding:.875rem 1.1rem; border-radius:10px; margin-bottom:1.5rem; font-family:'Barlow',sans-serif; font-size:.88rem; line-height:1.5; }
  .m-banner.warning { background:rgba(197,160,40,.1); border:1px solid rgba(197,160,40,.3); color:#7a5e10; }
  .m-banner.locked  { background:rgba(10,22,40,.05);  border:1px solid rgba(10,22,40,.12);  color:#333; }
  .m-progress-wrap { margin-bottom:1.5rem; display:flex; align-items:center; gap:12px; }
  .m-progress-bar  { flex:1; height:6px; background:rgba(0,0,0,.08); border-radius:99px; overflow:hidden; }
  .m-progress-fill { height:100%; background:linear-gradient(90deg,#C8102E,#e63950); border-radius:99px; transition:width .4s ease; }
  .m-progress-label { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:600; letter-spacing:.1em; color:#aaa; white-space:nowrap; }
  .m-nav { position:sticky; top:60px; z-index:10; background:rgba(248,246,242,.95); backdrop-filter:blur(8px); margin:0 -1rem 1.5rem; padding:.6rem 1rem; border-bottom:1px solid rgba(0,0,0,.06); display:flex; flex-direction:column; gap:6px; }
  .m-nav-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; }
  .m-nav-grid-playoff { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; }
  .m-nav-btn { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; padding:6px 8px; border-radius:6px; border:1.5px solid rgba(0,0,0,.1); background:#fff; color:#999; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:5px; width:100%; text-align:center; }
  .m-nav-btn:hover  { border-color:#0a1628; color:#0a1628; }
  .m-nav-btn.active { background:#0a1628; color:#F0D060; border-color:#0a1628; }
  .m-nav-btn.klar   { border-color:rgba(50,160,80,.35); color:rgba(40,140,70,.85); background:rgba(50,160,80,.06); }
  .m-nav-btn.pending { border-color:rgba(200,16,46,.35); color:#C8102E; background:rgba(200,16,46,.05); font-weight:800; }
  .m-nav-btn.slutspel-btn { border-color:rgba(197,160,40,.3); color:#7a5e10; background:rgba(197,160,40,.06); }
  .m-nav-btn.slutspel-btn.active { background:linear-gradient(135deg,#C5A028,#a8881f); color:#fff; border-color:transparent; }
  .m-nav-badge { background:#C8102E; color:#fff; font-size:9px; font-weight:700; padding:1px 5px; border-radius:100px; line-height:1.4; flex-shrink:0; }
  .m-nav-btn.active .m-nav-badge { background:rgba(255,255,255,.25); }
  .m-nav-check { font-size:.7rem; opacity:.7; flex-shrink:0; }
  .m-group { margin-bottom:2.5rem; }
  .m-group-header { display:flex; align-items:center; gap:10px; margin-bottom:1rem; }
  .m-group-pill { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; background:#0a1628; color:#F0D060; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .m-group-pill.slutspel { background:linear-gradient(135deg,#C5A028,#a8881f); color:#fff; }
  .m-group-line { flex:1; height:1px; background:rgba(0,0,0,.07); }
  .m-date-header { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#aaa; margin:.75rem 0 .5rem; }

  /* Sort toggle */
  .m-sort-toggle { display:inline-flex; background:rgba(0,0,0,.05); border-radius:8px; padding:3px; gap:2px; margin-bottom:1.25rem; }
  .m-sort-btn { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:6px 16px; border:none; border-radius:6px; cursor:pointer; background:transparent; color:#999; transition:all .15s; }
  .m-sort-btn.active { background:#fff; color:#0a1628; box-shadow:0 1px 3px rgba(0,0,0,.12); }
  .m-sort-btn:hover:not(.active) { color:#555; }

  /* Match label in date view */
  .m-match-label { display:flex; align-items:center; gap:6px; margin-bottom:.25rem; }
  .m-match-pill { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding:2px 8px; border-radius:20px; background:#0a1628; color:#F0D060; white-space:nowrap; }
  .m-match-pill.slutspel { background:linear-gradient(135deg,#C5A028,#a8881f); color:#fff; }

  ${MATCH_KORT_STYLES}
`

export default function Matches() {
  const [matcher, setMatcher] = useState([])
  const [minaTips, setMinaTips] = useState({})
  const [odds, setOdds] = useState({})         // match_id → { home_prob, draw_prob, away_prob }
  const [matchStats, setMatchStats] = useState({}) // match_id → stats object
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [aktivGrupp, setAktivGrupp] = useState(null)
  const [sortering, setSortering]   = useState('grupp')
  const gruppRefs = useRef({})
  const { användare } = useAuth()
  const { ärLåst, adminOverride } = useLås()
  const { t, språk } = useLanguage()

  const GRUPPSPEL_DEADLINE = new Date('2026-06-11T19:00:00+02:00')
  const gruppspelLåst = new Date() >= GRUPPSPEL_DEADLINE

  useEffect(() => {
    hämtaMatcher()
    hämtaOdds()
    if (gruppspelLåst) hämtaMatchStats()
    if (användare) hämtaMinaTips()
  }, [användare])

  async function hämtaMatcher() {
    const res = await fetch('/.netlify/functions/matches')
    const data = await res.json()
    setMatcher(data)
    setLaddar(false)
  }

  async function hämtaMinaTips() {
    const res = await fetch(`/.netlify/functions/tips?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${användare.token}` },
    })
    const data = await res.json()
    const map = {}
    data.forEach((tip) => { map[tip.match_id] = tip })
    setMinaTips(map)
  }

  async function hämtaOdds() {
    try {
      const res = await fetch('/.netlify/functions/odds')
      if (!res.ok) return
      const { odds: oddsLista } = await res.json()
      if (!Array.isArray(oddsLista)) return
      // Build a lookup by normalized "home_away" key — resolved later per match
      const lookup = {}
      oddsLista.forEach(o => {
        const key = normName(o.home_team) + '_' + normName(o.away_team)
        lookup[key] = o
      })
      setOdds(lookup)
    } catch { /* silently ignore */ }
  }

  async function hämtaMatchStats() {
    try {
      const res = await fetch('/.netlify/functions/match-stats')
      if (!res.ok) return
      const data = await res.json()
      setMatchStats(data)
    } catch { /* silently ignore */ }
  }

  /** Resolve odds entry for a specific match by normalizing team names */
  function oddsForMatch(match) {
    const key = normName(match.hemmalag) + '_' + normName(match.bortalag)
    return odds[key] || null
  }

  async function sparaTips(match_id, hemma, borta) {
    if (!användare) return
    setSparar(match_id)
    try {
      const res = await fetch('/.netlify/functions/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
        body: JSON.stringify({ match_id, hemma_mål: hemma, borta_mål: borta }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[sparaTips] fel:', res.status, err)
      }
    } catch (e) {
      console.error('[sparaTips] nätverksfel:', e)
    } finally {
      setSparar(null)
      hämtaMinaTips()
    }
  }

  function slutspelsNamn(omgång) {
    return t(`matches.slutspelsNamn.${omgång}`) !== `matches.slutspelsNamn.${omgång}`
      ? t(`matches.slutspelsNamn.${omgång}`)
      : omgång
  }

  const gruppspelsMatcher = matcher.filter(m => !ärSlutspel(m))
  const slutspelsMatcher  = matcher.filter(m => ärSlutspel(m))

  const gruppspelets = gruppspelsMatcher.reduce((acc, m) => {
    const g = m.grupp || 'Övrigt'
    if (!acc[g]) acc[g] = {}
    const d = adjustedDatum(m)
    if (!acc[g][d]) acc[g][d] = []
    acc[g][d].push(m)
    return acc
  }, {})
  // Sortera dagar kronologiskt och matcher inom varje dag på faktisk avsparkstid.
  Object.keys(gruppspelets).forEach((g) => { gruppspelets[g] = ordnaDagar(gruppspelets[g]) })

  const slutspelet = slutspelsMatcher.reduce((acc, m) => {
    const omg = m.omgång || 'Slutspel'
    if (!acc[omg]) acc[omg] = {}
    const d = adjustedDatum(m)
    if (!acc[omg][d]) acc[omg][d] = []
    acc[omg][d].push(m)
    return acc
  }, {})
  Object.keys(slutspelet).forEach((omg) => { slutspelet[omg] = ordnaDagar(slutspelet[omg]) })

  const sorteradSlutspel = Object.entries(slutspelet).sort(([a], [b]) => {
    const ai = SLUTSPELS_ORDNING.indexOf(a)
    const bi = SLUTSPELS_ORDNING.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'sv')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const totalTips = gruppspelsMatcher.length
  const besvarade = gruppspelsMatcher.filter(m => minaTips[m.match_id]).length
  const progress  = totalTips > 0 ? Math.round((besvarade / totalTips) * 100) : 0

  function scrollToGrupp(nyckel) {
    setAktivGrupp(nyckel)
    const el = gruppRefs.current[nyckel]
    if (el) {
      const offset = 120
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  function otippade(matcherIGrupp) {
    if (!användare) return 0
    return matcherIGrupp.filter(m => !minaTips[m.match_id] && !ärLåst(m)).length
  }

  function ärKlar(matcherIGrupp) {
    if (!användare) return false
    const öppna = matcherIGrupp.filter(m => !ärLåst(m))
    return öppna.length > 0 && öppna.every(m => !minaTips[m.match_id])
      ? false
      : öppna.length > 0 && öppna.every(m => !!minaTips[m.match_id])
  }

  const gruppNycklar = Object.keys(gruppspelets)
  const slutspelNycklar = sorteradSlutspel.map(([omg]) => omg)

  // Datumvy: alla matcher kronologiskt på faktisk avsparkstid (UTC), grupperade per svensk dag.
  const datumSorterade = [...matcher].sort(efterStarttid)
  const datumGrupperade = datumSorterade.reduce((acc, m) => {
    const d = adjustedDatum(m)
    if (!acc[d]) acc[d] = []
    acc[d].push(m)
    return acc
  }, {})

  if (laddar) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
      {t('matches.laddar')}
    </div>
  )

  function renderMatch(match, visaLabel = false) {
    const label = match.omgång && SLUTSPELS_ORDNING.includes(match.omgång)
      ? slutspelsNamn(match.omgång)
      : match.grupp || null
    const ärSlutspelMatch = match.omgång && SLUTSPELS_ORDNING.includes(match.omgång)
    return (
      <div key={match.match_id}>
        {visaLabel && label && (
          <div className="m-match-label">
            <span className={`m-match-pill${ärSlutspelMatch ? ' slutspel' : ''}`}>{label}</span>
          </div>
        )}
        <MatchKort
          match={match}
          tip={minaTips[match.match_id]}
          inloggad={!!användare}
          tipsLåst={ärLåst(match)}
          sparar={sparar === match.match_id}
          onSpara={sparaTips}
          odds={oddsForMatch(match)}
          stats={matchStats[match.match_id] || null}
          t={t}
        />
      </div>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="m-wrap">
        <p className="m-eyebrow">{t('matches.eyebrow')}</p>
        <h2 className="m-title">{t('matches.titel')}</h2>

        <div className="m-info-box">
          <strong>ℹ️ {språk === 'en' ? 'Prediction rules' : 'Tippningsregler'}</strong><br />
          {t('matches.infoBox')}
        </div>

        {användare && !adminOverride && (
          <div className="m-progress-wrap">
            <div className="m-progress-bar">
              <div className="m-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="m-progress-label">
              {t('matches.progress', { besvarade, total: totalTips })}
            </span>
          </div>
        )}
        {!användare && (
          <div className="m-banner warning">
            <span>🔑</span>
            <span>{t('matches.loggaInBanner')}</span>
          </div>
        )}
        {användare && adminOverride && (
          <div className="m-banner locked">
            <span>🔒</span>
            <span>{t('matches.låstBanner')}</span>
          </div>
        )}

        {/* Sort toggle */}
        <div className="m-sort-toggle">
          <button className={`m-sort-btn${sortering === 'grupp' ? ' active' : ''}`} onClick={() => setSortering('grupp')}>
            {språk === 'en' ? 'Group' : 'Grupp'}
          </button>
          <button className={`m-sort-btn${sortering === 'datum' ? ' active' : ''}`} onClick={() => setSortering('datum')}>
            {språk === 'en' ? 'Date' : 'Datum'}
          </button>
        </div>

        {användare && sortering === 'grupp' && (
          <div className="m-nav">
            <div className="m-nav-grid">
              {gruppNycklar.map((grupp) => {
                const allaMatcher = Object.values(gruppspelets[grupp]).flat()
                const antal = otippade(allaMatcher)
                const klar = ärKlar(allaMatcher)
                const isPending = antal > 0
                const stateClass = aktivGrupp === grupp ? 'active' : isPending ? 'pending' : klar ? 'klar' : ''
                return (
                  <button
                    key={grupp}
                    className={`m-nav-btn ${stateClass}`}
                    onClick={() => scrollToGrupp(grupp)}
                  >
                    {grupp}
                    {isPending
                      ? <span className="m-nav-badge">{t('matches.kvar', { antal })}</span>
                      : klar && <span className="m-nav-check">✓</span>
                    }
                  </button>
                )
              })}
            </div>
            {slutspelNycklar.length > 0 && (
              <div className="m-nav-grid-playoff">
                {slutspelNycklar.map((omg) => {
                  const allaMatcher = Object.values(slutspelet[omg]).flat()
                  const antal = otippade(allaMatcher)
                  const klar = ärKlar(allaMatcher)
                  return (
                    <button
                      key={omg}
                      className={`m-nav-btn slutspel-btn ${aktivGrupp === omg ? 'active' : klar ? 'klar' : ''}`}
                      onClick={() => scrollToGrupp(omg)}
                    >
                      {slutspelsNamn(omg)}
                      {antal > 0 && <span className="m-nav-badge">{antal}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Gruppvy ── */}
        {sortering === 'grupp' && (
          <>
            {Object.entries(gruppspelets).map(([grupp, datumGrupper]) => (
              <div key={grupp} className="m-group" ref={el => gruppRefs.current[grupp] = el}>
                <div className="m-group-header">
                  <span className="m-group-pill">{grupp}</span>
                  <div className="m-group-line" />
                </div>
                {Object.entries(datumGrupper).map(([datum, dagensMatcherna]) => (
                  <div key={datum}>
                    <div className="m-date-header">{formatDatum(datum, språk)}</div>
                    {dagensMatcherna.map(m => renderMatch(m))}
                  </div>
                ))}
              </div>
            ))}

            {sorteradSlutspel.map(([omgång, datumGrupper]) => (
              <div key={omgång} className="m-group" ref={el => gruppRefs.current[omgång] = el}>
                <div className="m-group-header">
                  <span className="m-group-pill slutspel">🏆 {slutspelsNamn(omgång)}</span>
                  <div className="m-group-line" />
                </div>
                {Object.entries(datumGrupper).map(([datum, dagensMatcherna]) => (
                  <div key={datum}>
                    <div className="m-date-header">{formatDatum(datum, språk)}</div>
                    {dagensMatcherna.map(m => renderMatch(m))}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* ── Datumvy: alla matcher kronologiskt ── */}
        {sortering === 'datum' && (
          <>
            {Object.entries(datumGrupperade).map(([datum, dagensMatcherna]) => (
              <div key={datum} className="m-group">
                <div className="m-group-header">
                  <span className="m-group-pill">{formatDatum(datum, språk)}</span>
                  <div className="m-group-line" />
                </div>
                {dagensMatcherna.map(m => renderMatch(m, true))}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

