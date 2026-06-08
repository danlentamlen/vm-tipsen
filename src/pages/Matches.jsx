import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLås } from '../hooks/useLås'
import { useLanguage } from '../context/LanguageContext'
import DistributionModal from '../components/DistributionModal'

// ── Flaggor ────────────────────────────────────────────────────────────────
const FLAGS = {
  'Afghanistan':'🇦🇫','Albania':'🇦🇱','Algeria':'🇩🇿','Andorra':'🇦🇩','Angola':'🇦🇴','Antigua and Barbuda':'🇦🇬','Argentina':'🇦🇷','Armenia':'🇦🇲','Australia':'🇦🇺','Austria':'🇦🇹','Azerbaijan':'🇦🇿',
  'Bahamas':'🇧🇸','Bahrain':'🇧🇭','Bangladesh':'🇧🇩','Barbados':'🇧🇧','Belarus':'🇧🇾','Belgium':'🇧🇪','Belize':'🇧🇿','Benin':'🇧🇯','Bhutan':'🇧🇹','Bolivia':'🇧🇴','Bosnia & Herzegovina':'🇧🇦','Bosnia and Herzegovina':'🇧🇦','Botswana':'🇧🇼','Brazil':'🇧🇷','Brunei':'🇧🇳','Bulgaria':'🇧🇬','Burkina Faso':'🇧🇫','Burundi':'🇧🇮',
  'Cabo Verde':'🇨🇻','Cambodia':'🇰🇭','Cameroon':'🇨🇲','Canada':'🇨🇦','Central African Republic':'🇨🇫','Chad':'🇹🇩','Chile':'🇨🇱','China':'🇨🇳','China PR':'🇨🇳','Colombia':'🇨🇴','Comoros':'🇰🇲','Congo':'🇨🇬','Costa Rica':'🇨🇷','Croatia':'🇭🇷','Cuba':'🇨🇺','Curaçao':'🇨🇼','Curacao':'🇨🇼','Cyprus':'🇨🇾','Czech Republic':'🇨🇿','Czechia':'🇨🇿',
  'DR Congo':'🇨🇩','Denmark':'🇩🇰','Djibouti':'🇩🇯','Dominican Republic':'🇩🇴',
  'Ecuador':'🇪🇨','Egypt':'🇪🇬','El Salvador':'🇸🇻','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Equatorial Guinea':'🇬🇶','Eritrea':'🇪🇷','Estonia':'🇪🇪','Eswatini':'🇸🇿','Ethiopia':'🇪🇹',
  'Fiji':'🇫🇯','Finland':'🇫🇮','France':'🇫🇷',
  'Gabon':'🇬🇦','Gambia':'🇬🇲','Georgia':'🇬🇪','Germany':'🇩🇪','Ghana':'🇬🇭','Greece':'🇬🇷','Guatemala':'🇬🇹','Guinea':'🇬🇳','Guinea-Bissau':'🇬🇼',
  'Haiti':'🇭🇹','Honduras':'🇭🇳','Hungary':'🇭🇺',
  'Iceland':'🇮🇸','India':'🇮🇳','Indonesia':'🇮🇩','Iran':'🇮🇷','IR Iran':'🇮🇷','Iraq':'🇮🇶','Ireland':'🇮🇪','Israel':'🇮🇱','Italy':'🇮🇹','Ivory Coast':'🇨🇮',
  'Jamaica':'🇯🇲','Japan':'🇯🇵','Jordan':'🇯🇴',
  'Kazakhstan':'🇰🇿','Kenya':'🇰🇪','Kosovo':'🇽🇰','Kuwait':'🇰🇼','Kyrgyzstan':'🇰🇬',
  'Laos':'🇱🇦','Latvia':'🇱🇻','Lebanon':'🇱🇧','Liberia':'🇱🇷','Libya':'🇱🇾','Liechtenstein':'🇱🇮','Lithuania':'🇱🇹','Luxembourg':'🇱🇺',
  'Madagascar':'🇲🇬','Malawi':'🇲🇼','Malaysia':'🇲🇾','Mali':'🇲🇱','Malta':'🇲🇹','Mauritania':'🇲🇷','Mexico':'🇲🇽','Moldova':'🇲🇩','Mongolia':'🇲🇳','Montenegro':'🇲🇪','Morocco':'🇲🇦','Mozambique':'🇲🇿','Myanmar':'🇲🇲',
  'Namibia':'🇳🇦','Nepal':'🇳🇵','Netherlands':'🇳🇱','New Zealand':'🇳🇿','Nicaragua':'🇳🇮','Niger':'🇳🇪','Nigeria':'🇳🇬','North Korea':'🇰🇵','North Macedonia':'🇲🇰','Norway':'🇳🇴',
  'Oman':'🇴🇲',
  'Pakistan':'🇵🇰','Panama':'🇵🇦','Paraguay':'🇵🇾','Peru':'🇵🇪','Philippines':'🇵🇭','Poland':'🇵🇱','Portugal':'🇵🇹',
  'Qatar':'🇶🇦',
  'Romania':'🇷🇴','Russia':'🇷🇺','Rwanda':'🇷🇼',
  'Saudi Arabia':'🇸🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Senegal':'🇸🇳','Serbia':'🇷🇸','Sierra Leone':'🇸🇱','Singapore':'🇸🇬','Slovakia':'🇸🇰','Slovenia':'🇸🇮','Solomon Islands':'🇸🇧','Somalia':'🇸🇴','South Africa':'🇿🇦','South Korea':'🇰🇷','Korea Republic':'🇰🇷','Korea DPR':'🇰🇵','South Sudan':'🇸🇸','Spain':'🇪🇸','Sri Lanka':'🇱🇰','Sudan':'🇸🇩','Suriname':'🇸🇷','Sweden':'🇸🇪','Sverige':'🇸🇪','Switzerland':'🇨🇭','Syria':'🇸🇾',
  'Taiwan':'🇹🇼','Tajikistan':'🇹🇯','Tanzania':'🇹🇿','Thailand':'🇹🇭','Timor-Leste':'🇹🇱','Togo':'🇹🇬','Trinidad and Tobago':'🇹🇹','Tunisia':'🇹🇳','Turkey':'🇹🇷','Türkiye':'🇹🇷','Turkmenistan':'🇹🇲',
  'Uganda':'🇺🇬','Ukraine':'🇺🇦','United Arab Emirates':'🇦🇪','UAE':'🇦🇪','United States':'🇺🇸','USA':'🇺🇸','Uruguay':'🇺🇾','Uzbekistan':'🇺🇿',
  'Venezuela':'🇻🇪','Vietnam':'🇻🇳',
  'Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Yemen':'🇾🇪','Zambia':'🇿🇲','Zimbabwe':'🇿🇼',
}

function getFlag(lagnamn) {
  if (!lagnamn) return '🏳'
  if (FLAGS[lagnamn]) return FLAGS[lagnamn]
  const trimmat = lagnamn.trim()
  if (FLAGS[trimmat]) return FLAGS[trimmat]
  const hit = Object.keys(FLAGS).find(k => k.toLowerCase() === trimmat.toLowerCase())
  return hit ? FLAGS[hit] : '🏳'
}

function formatDatum(datum, språk) {
  if (!datum) return ''
  try {
    const d = new Date(datum)
    const locale = språk === 'en' ? 'en-GB' : 'sv-SE'
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return datum }
}

function formatTid(tid) {
  if (!tid) return ''
  return tid.replace(/\s*UTC[+-]?\d*/i, '').trim()
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

  .m-info-box {
    background: linear-gradient(135deg, rgba(10,22,40,0.04), rgba(10,22,40,0.02));
    border: 1px solid rgba(10,22,40,0.1);
    border-left: 3px solid #0a1628;
    border-radius: 10px;
    padding: .875rem 1.1rem;
    margin-bottom: 1.5rem;
    font-family: 'Barlow', sans-serif;
    font-size: .85rem;
    color: #444;
    line-height: 1.6;
  }
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

  .mc { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; margin-bottom:.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); transition:box-shadow .15s; }
  .mc.clickable { cursor:pointer; }
  .mc.clickable:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); }
  .mc.has-tip { border-left:3px solid #C5A028; }
  .mc-body { display:flex; align-items:center; padding:.75rem 1rem; gap:8px; }
  .mc-teams { display:flex; align-items:center; flex:1; gap:8px; min-width:0; }
  .mc-team-home, .mc-team-away { display:flex; align-items:center; gap:6px; flex:1; min-width:0; }
  .mc-team-home { justify-content:flex-end; }
  .mc-team-away { justify-content:flex-start; }
  .mc-team-name { font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px; }
  .mc-flag-wrap { font-size:1.25rem; line-height:1; flex-shrink:0; }
  .mc-centre { display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0; min-width:110px; }
  .mc-inputs { display:flex; align-items:center; gap:4px; }
  .mc-input { width:36px; text-align:center; font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; padding:4px 2px; border:1.5px solid rgba(0,0,0,.12); border-radius:6px; background:#fafafa; color:#0a1628; outline:none; transition:border-color .15s; -moz-appearance:textfield; }
  .mc-input::-webkit-outer-spin-button,.mc-input::-webkit-inner-spin-button { -webkit-appearance:none; }
  .mc-input:focus { border-color:#C5A028; background:#fff; }
  .mc-sep { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#aaa; }
  .mc-save { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:5px 12px; border-radius:6px; border:none; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .mc-save.new    { background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; }
  .mc-save.update { background:#f0ede6; color:#666; }
  .mc-save.new:hover    { opacity:.88; }
  .mc-save.update:hover { background:#e8e4dc; }
  .mc-save:disabled { opacity:.4; cursor:not-allowed; }
  .mc-vs { font-family:'Barlow Condensed',sans-serif; font-size:.8rem; font-weight:600; letter-spacing:.1em; color:#ccc; }
  .mc-score-locked { display:flex; align-items:center; gap:4px; }
  .mc-score-box { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; color:#0a1628; background:rgba(197,160,40,.1); border:1px solid rgba(197,160,40,.25); border-radius:6px; padding:3px 8px; min-width:28px; text-align:center; }
  .mc-footer { display:flex; align-items:center; gap:6px; padding:.4rem 1rem .5rem; border-top:1px solid rgba(0,0,0,.05); font-family:'Barlow',sans-serif; font-size:.75rem; color:#bbb; }
  .mc-footer-dot { width:3px; height:3px; border-radius:50%; background:#ddd; }
`

export default function Matches() {
  const [matcher, setMatcher] = useState([])
  const [minaTips, setMinaTips] = useState({})
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [valdMatch, setValdMatch] = useState(null)
  const [aktivGrupp, setAktivGrupp] = useState(null)
  const gruppRefs = useRef({})
  const { användare } = useAuth()
  const { ärLåst, adminOverride } = useLås()
  const { t, språk } = useLanguage()

  useEffect(() => {
    hämtaMatcher()
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
    const d = m.datum || 'Okänt datum'
    if (!acc[g][d]) acc[g][d] = []
    acc[g][d].push(m)
    return acc
  }, {})

  const slutspelet = slutspelsMatcher.reduce((acc, m) => {
    const omg = m.omgång || 'Slutspel'
    if (!acc[omg]) acc[omg] = {}
    const d = m.datum || 'Okänt datum'
    if (!acc[omg][d]) acc[omg][d] = []
    acc[omg][d].push(m)
    return acc
  }, {})

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

  if (laddar) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
      {t('matches.laddar')}
    </div>
  )

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

        {användare && (
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

        {Object.entries(gruppspelets).map(([grupp, datumGrupper]) => (
          <div key={grupp} className="m-group" ref={el => gruppRefs.current[grupp] = el}>
            <div className="m-group-header">
              <span className="m-group-pill">{grupp}</span>
              <div className="m-group-line" />
            </div>
            {Object.entries(datumGrupper).map(([datum, dagensMatcherna]) => (
              <div key={datum}>
                <div className="m-date-header">{formatDatum(datum, språk)}</div>
                {dagensMatcherna.map((match) => (
                  <MatchKort
                    key={match.match_id}
                    match={match}
                    tip={minaTips[match.match_id]}
                    inloggad={!!användare}
                    tipsLåst={ärLåst(match)}
                    sparar={sparar === match.match_id}
                    onSpara={sparaTips}
                    onKlick={ärLåst(match) ? () => setValdMatch(match) : null}
                    t={t}
                  />
                ))}
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
                {dagensMatcherna.map((match) => (
                  <MatchKort
                    key={match.match_id}
                    match={match}
                    tip={minaTips[match.match_id]}
                    inloggad={!!användare}
                    tipsLåst={ärLåst(match)}
                    sparar={sparar === match.match_id}
                    onSpara={sparaTips}
                    onKlick={ärLåst(match) ? () => setValdMatch(match) : null}
                    t={t}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}

        {valdMatch && (
          <DistributionModal
            typ="match" id={valdMatch.match_id}
            titel={`${valdMatch.hemmalag} vs ${valdMatch.bortalag}`}
            onStäng={() => setValdMatch(null)}
          />
        )}
      </div>
    </>
  )
}

function MatchKort({ match, tip, inloggad, tipsLåst, sparar, onSpara, onKlick, t }) {
  const [hemma, setHemma] = useState(tip?.hemma_mål ?? '')
  const [borta, setBorta] = useState(tip?.borta_mål ?? '')

  useEffect(() => {
    setHemma(tip?.hemma_mål ?? '')
    setBorta(tip?.borta_mål ?? '')
  }, [tip])

  const harTips = tip !== undefined
  const tid = formatTid(match.tid)

  return (
    <div
      className={`mc ${onKlick ? 'clickable' : ''} ${harTips ? 'has-tip' : ''}`}
      onClick={onKlick || undefined}
    >
      <div className="mc-body">
        <div className="mc-teams">
          <div className="mc-team-home">
            <span className="mc-team-name">{match.hemmalag}</span>
            <div className="mc-flag-wrap">{getFlag(match.hemmalag)}</div>
          </div>

          <div className="mc-centre">
            {inloggad && !tipsLåst ? (
              <>
                <div className="mc-inputs" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number" min="0" max="99"
                    value={hemma}
                    onChange={(e) => setHemma(e.target.value)}
                    className="mc-input"
                    placeholder="–"
                  />
                  <span className="mc-sep">–</span>
                  <input
                    type="number" min="0" max="99"
                    value={borta}
                    onChange={(e) => setBorta(e.target.value)}
                    className="mc-input"
                    placeholder="–"
                  />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onSpara(match.match_id, hemma, borta) }}
                  disabled={sparar || hemma === '' || borta === ''}
                  className={`mc-save ${harTips ? 'update' : 'new'}`}
                >
                  {sparar ? t('matches.sparar') : harTips ? t('matches.uppdatera') : t('matches.spara')}
                </button>
              </>
            ) : inloggad && tipsLåst && harTips ? (
              <div className="mc-score-locked">
                <span className="mc-score-box">{hemma}</span>
                <span className="mc-sep">–</span>
                <span className="mc-score-box">{borta}</span>
              </div>
            ) : (
              <span className="mc-vs">{t('matches.vs')}</span>
            )}
          </div>

          <div className="mc-team-away">
            <div className="mc-flag-wrap">{getFlag(match.bortalag)}</div>
            <span className="mc-team-name">{match.bortalag}</span>
          </div>
        </div>
      </div>

      {(tid || match.arena) && (
        <div className="mc-footer">
          {tid && <span>{tid}</span>}
          {tid && match.arena && <span className="mc-footer-dot" />}
          {match.arena && <span>{match.arena}</span>}
        </div>
      )}
    </div>
  )
}