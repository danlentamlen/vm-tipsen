import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'
import DistributionModal from '../components/DistributionModal'

// Flaggor
const FLAGS = {
  'Afghanistan':'🇦🇫','Albania':'🇦🇱','Algeria':'🇩🇿','Andorra':'🇦🇩','Angola':'🇦🇴','Argentina':'🇦🇷','Armenia':'🇦🇲','Australia':'🇦🇺','Austria':'🇦🇹','Azerbaijan':'🇦🇿',
  'Bahrain':'🇧🇭','Bangladesh':'🇧🇩','Belarus':'🇧🇾','Belgium':'🇧🇪','Belize':'🇧🇿','Benin':'🇧🇯','Bolivia':'🇧🇴','Bosnia and Herzegovina':'🇧🇦','Botswana':'🇧🇼','Brazil':'🇧🇷','Bulgaria':'🇧🇬','Burkina Faso':'🇧🇫',
  'Cambodia':'🇰🇭','Cameroon':'🇨🇲','Canada':'🇨🇦','Chile':'🇨🇱','China':'🇨🇳','Colombia':'🇨🇴','Congo':'🇨🇬','Costa Rica':'🇨🇷','Croatia':'🇭🇷','Cuba':'🇨🇺','Czech Republic':'🇨🇿','Czechia':'🇨🇿',
  'Denmark':'🇩🇰',
  'Ecuador':'🇪🇨','Egypt':'🇪🇬','El Salvador':'🇸🇻','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Estonia':'🇪🇪','Ethiopia':'🇪🇹',
  'Finland':'🇫🇮','France':'🇫🇷',
  'Gabon':'🇬🇦','Germany':'🇩🇪','Ghana':'🇬🇭','Greece':'🇬🇷','Guatemala':'🇬🇹','Guinea':'🇬🇳',
  'Haiti':'🇭🇹','Honduras':'🇭🇳','Hungary':'🇭🇺',
  'Iceland':'🇮🇸','India':'🇮🇳','Indonesia':'🇮🇩','Iran':'🇮🇷','Iraq':'🇮🇶','Ireland':'🇮🇪','Israel':'🇮🇱','Italy':'🇮🇹','Ivory Coast':'🇨🇮',
  'Jamaica':'🇯🇲','Japan':'🇯🇵','Jordan':'🇯🇴',
  'Kazakhstan':'🇰🇿','Kenya':'🇰🇪','Kosovo':'🇽🇰','Kuwait':'🇰🇼','Kyrgyzstan':'🇰🇬',
  'Latvia':'🇱🇻','Lebanon':'🇱🇧','Libya':'🇱🇾','Lithuania':'🇱🇹','Luxembourg':'🇱🇺',
  'Madagascar':'🇲🇬','Malaysia':'🇲🇾','Mali':'🇲🇱','Malta':'🇲🇹','Mexico':'🇲🇽','Moldova':'🇲🇩','Mongolia':'🇲🇳','Montenegro':'🇲🇪','Morocco':'🇲🇦','Mozambique':'🇲🇿',
  'Namibia':'🇳🇦','Nepal':'🇳🇵','Netherlands':'🇳🇱','New Zealand':'🇳🇿','Nicaragua':'🇳🇮','Nigeria':'🇳🇬','North Korea':'🇰🇵','North Macedonia':'🇲🇰','Northern Ireland':'🏴','Norway':'🇳🇴',
  'Oman':'🇴🇲',
  'Pakistan':'🇵🇰','Palestine':'🇵🇸','Panama':'🇵🇦','Papua New Guinea':'🇵🇬','Paraguay':'🇵🇾','Peru':'🇵🇪','Philippines':'🇵🇭','Poland':'🇵🇱','Portugal':'🇵🇹',
  'Qatar':'🇶🇦',
  'Romania':'🇷🇴','Russia':'🇷🇺','Rwanda':'🇷🇼',
  'San Marino':'🇸🇲','Saudi Arabia':'🇸🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Senegal':'🇸🇳','Serbia':'🇷🇸','Sierra Leone':'🇸🇱','Singapore':'🇸🇬','Slovakia':'🇸🇰','Slovenia':'🇸🇮','Solomon Islands':'🇸🇧','Somalia':'🇸🇴','South Africa':'🇿🇦','South Korea':'🇰🇷','Korea Republic':'🇰🇷','Korea DPR':'🇰🇵','South Sudan':'🇸🇸','Spain':'🇪🇸','Sri Lanka':'🇱🇰','Sudan':'🇸🇩','Suriname':'🇸🇷','Sweden':'🇸🇪','Sverige':'🇸🇪','Switzerland':'🇨🇭','Syria':'🇸🇾',
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

function formatDatum(datum) {
  if (!datum) return ''
  try {
    const d = new Date(datum)
    return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return datum }
}

function formatTid(tid) {
  if (!tid) return ''
  return tid.replace(/\s*UTC[+-]?\d*/i, '').trim()
}

// Sorteringsordning och svenska namn — exakta värden från Google Sheet
const SLUTSPELS_ORDNING = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

const SLUTSPELS_NAMN = {
  'Round of 32':           'Sextondelsfinal',
  'Round of 16':           'Åttondelsfinal',
  'Quarter-final':         'Kvartsfinal',
  'Semi-final':            'Semifinal',
  'Match for third place': 'Match om 3:e plats',
  'Final':                 'Final',
}

function slutspelsNamn(omgång) {
  return SLUTSPELS_NAMN[omgång] || omgång
}

// Är detta en slutspelsmatch?
function ärSlutspel(m) {
  return m.grupp === 'Slutspel'
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&display=swap');

  .m-wrap { max-width:760px; margin:0 auto; padding:2rem 1rem 4rem; }
  .m-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .m-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.25rem; }

  /* Info-ruta */
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
  .m-banner.locked  { background:rgba(200,16,46,.07); border:1px solid rgba(200,16,46,.2); color:#8a1020; }

  .m-progress-wrap { display:flex; align-items:center; gap:10px; margin-bottom:1.75rem; }
  .m-progress-bar  { flex:1; height:4px; background:rgba(0,0,0,.07); border-radius:2px; overflow:hidden; }
  .m-progress-fill { height:100%; background:linear-gradient(90deg,#C8102E,#C5A028); border-radius:2px; transition:width .4s ease; }
  .m-progress-label { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:600; letter-spacing:.1em; color:#aaa; white-space:nowrap; }

  .m-group { margin-bottom:2.5rem; }
  .m-group-header { display:flex; align-items:center; gap:12px; margin-bottom:1rem; }
  .m-group-pill { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; padding:3px 12px; border-radius:100px; }
  .m-group-pill.slutspel { background:linear-gradient(135deg,#C8102E,#a80d27); }
  .m-group-line { flex:1; height:1px; background:rgba(0,0,0,.08); }

  .m-date-header { font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:600; letter-spacing:.14em; color:#aaa; padding:.5rem 0 .4rem; text-transform:capitalize; }

  .mc { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; margin-bottom:.5rem; box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; transition:box-shadow .15s, border-color .15s; }
  .mc.clickable { cursor:pointer; }
  .mc.clickable:hover { box-shadow:0 6px 20px rgba(0,0,0,.09); border-color:rgba(197,160,40,.4); }
  .mc.has-tip { border-left:3px solid #C5A028; }

  .mc-body { padding:.875rem 1rem; }
  .mc-teams { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px; }

  .mc-team-home { display:flex; align-items:center; justify-content:flex-end; gap:10px; min-width:0; }
  .mc-team-away { display:flex; align-items:center; justify-content:flex-start; gap:10px; min-width:0; }

  .mc-flag-wrap { width:36px; height:26px; border-radius:4px; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:#f4f2ee; font-size:1.3rem; line-height:1; border:1px solid rgba(0,0,0,.06); }

  .mc-team-name { font-family:'Barlow',sans-serif; font-size:.92rem; font-weight:600; color:#0a1628; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mc-team-home .mc-team-name { text-align:right; }
  .mc-team-away .mc-team-name { text-align:left; }

  .mc-centre { display:flex; flex-direction:column; align-items:center; gap:3px; flex-shrink:0; }
  .mc-inputs { display:flex; align-items:center; gap:4px; }
  .mc-input { width:38px; height:34px; border:1.5px solid #e5e0d8; border-radius:7px; text-align:center; font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; color:#0a1628; background:#faf8f4; outline:none; -moz-appearance:textfield; }
  .mc-input::-webkit-outer-spin-button,.mc-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
  .mc-input:focus { border-color:#C5A028; }
  .mc-sep { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; color:#bbb; }
  .mc-vs { font-family:'Barlow Condensed',sans-serif; font-size:.8rem; font-weight:700; letter-spacing:.1em; color:#bbb; }

  .mc-save { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border:none; border-radius:100px; padding:3px 10px; cursor:pointer; transition:all .15s; }
  .mc-save.new    { background:rgba(10,22,40,.08); color:#0a1628; }
  .mc-save.update { background:rgba(197,160,40,.15); color:#7a5c10; }
  .mc-save:hover:not(:disabled) { opacity:.8; }
  .mc-save:disabled { opacity:.4; cursor:not-allowed; }

  .mc-score-locked { display:flex; align-items:center; gap:4px; }
  .mc-score-box { width:30px; height:28px; display:flex; align-items:center; justify-content:center; background:#f4f2ee; border:1px solid rgba(0,0,0,.08); border-radius:6px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#0a1628; }

  .mc-footer { display:flex; align-items:center; gap:6px; padding:.4rem 1rem; border-top:1px solid rgba(0,0,0,.05); font-family:'Barlow',sans-serif; font-size:.75rem; color:#aaa; }
  .mc-footer-dot { width:3px; height:3px; border-radius:50%; background:#ddd; }

  @media (max-width:520px) {
    .mc-team-name { font-size:.78rem; }
    .mc-flag-wrap { width:28px; height:20px; font-size:1rem; }
    .mc-input { width:34px; font-size:1rem; }
    .mc-score-box { width:30px; font-size:1rem; }
    .mc-body { padding:.75rem .875rem; }
  }
`

export default function Matches() {
  const [matcher, setMatcher] = useState([])
  const [minaTips, setMinaTips] = useState({})
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [valdMatch, setValdMatch] = useState(null)
  const { användare } = useAuth()
  const { tipsLåst } = useSettings()

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
    const res = await fetch('/.netlify/functions/tips', {
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
    await fetch('/.netlify/functions/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
      body: JSON.stringify({ match_id, hemma_mål: hemma, borta_mål: borta }),
    })
    setSparar(null)
    hämtaMinaTips()
  }

  // Dela upp i gruppspel och slutspel
  const gruppspelsMatcher = matcher.filter(m => !ärSlutspel(m))
  const slutspelsMatcher  = matcher.filter(m => ärSlutspel(m))

  // Gruppera gruppspel: grupp → datum → matcher
  const gruppspelets = gruppspelsMatcher.reduce((acc, m) => {
    const g = m.grupp || 'Övrigt'
    if (!acc[g]) acc[g] = {}
    const d = m.datum || 'Okänt datum'
    if (!acc[g][d]) acc[g][d] = []
    acc[g][d].push(m)
    return acc
  }, {})

  // Gruppera slutspel: omgång → datum → matcher
  const slutspelet = slutspelsMatcher.reduce((acc, m) => {
    const omg = m.omgång || 'Slutspel'
    if (!acc[omg]) acc[omg] = {}
    const d = m.datum || 'Okänt datum'
    if (!acc[omg][d]) acc[omg][d] = []
    acc[omg][d].push(m)
    return acc
  }, {})

  // Sortera slutspelsomgångar i rätt ordning
  const sorteradSlutspel = Object.entries(slutspelet).sort(([a], [b]) => {
    const ai = SLUTSPELS_ORDNING.indexOf(a)
    const bi = SLUTSPELS_ORDNING.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'sv')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const totalTips = matcher.length
  const besvarade = Object.keys(minaTips).length
  const progress  = totalTips > 0 ? Math.round((besvarade / totalTips) * 100) : 0

  if (laddar) return <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#888' }}>Laddar matcher...</div>

  return (
    <>
      <style>{STYLES}</style>
      <div className="m-wrap">
        <p className="m-eyebrow">VM-tipsen 2026</p>
        <h2 className="m-title">Matchschema</h2>

        {/* Informationsruta om tippningsregler */}
        <div className="m-info-box">
          <strong>ℹ️ Tippningsregler</strong><br />
          Gruppspelet tippas fram till den <strong>11 juni</strong>. Varje slutspelsomgång öppnar för tips och stänger <strong>4 timmar</strong> innan första matchen i omgången spelas.
        </div>

        {användare && !tipsLåst && (
          <div className="m-progress-wrap">
            <div className="m-progress-bar"><div className="m-progress-fill" style={{ width:`${progress}%` }} /></div>
            <span className="m-progress-label">{besvarade} / {totalTips} tippade</span>
          </div>
        )}
        {!användare && <div className="m-banner warning"><span>🔑</span><span>Logga in för att lämna dina tips!</span></div>}
        {användare && tipsLåst && <div className="m-banner locked"><span>🔒</span><span>Tips är låsta — klicka på en match för att se tipsfördelningen.</span></div>}

        {/* Gruppspel */}
        {Object.entries(gruppspelets).map(([grupp, datumGrupper]) => (
          <div key={grupp} className="m-group">
            <div className="m-group-header">
              <span className="m-group-pill">{grupp}</span>
              <div className="m-group-line" />
            </div>
            {Object.entries(datumGrupper).map(([datum, dagensMatcherna]) => (
              <div key={datum}>
                <div className="m-date-header">{formatDatum(datum)}</div>
                {dagensMatcherna.map((match) => (
                  <MatchKort
                    key={match.match_id}
                    match={match}
                    tip={minaTips[match.match_id]}
                    inloggad={!!användare}
                    tipsLåst={tipsLåst}
                    sparar={sparar === match.match_id}
                    onSpara={sparaTips}
                    onKlick={tipsLåst ? () => setValdMatch(match) : null}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Slutspel grupperat efter omgång */}
        {sorteradSlutspel.map(([omgång, datumGrupper]) => (
          <div key={omgång} className="m-group">
            <div className="m-group-header">
              <span className="m-group-pill slutspel">🏆 {slutspelsNamn(omgång)}</span>
              <div className="m-group-line" />
            </div>
            {Object.entries(datumGrupper).map(([datum, dagensMatcherna]) => (
              <div key={datum}>
                <div className="m-date-header">{formatDatum(datum)}</div>
                {dagensMatcherna.map((match) => (
                  <MatchKort
                    key={match.match_id}
                    match={match}
                    tip={minaTips[match.match_id]}
                    inloggad={!!användare}
                    tipsLåst={tipsLåst}
                    sparar={sparar === match.match_id}
                    onSpara={sparaTips}
                    onKlick={tipsLåst ? () => setValdMatch(match) : null}
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

function MatchKort({ match, tip, inloggad, tipsLåst, sparar, onSpara, onKlick }) {
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
                  <input type="number" min="0" max="99" value={hemma} onChange={(e) => setHemma(e.target.value)} className="mc-input" placeholder="–" />
                  <span className="mc-sep">–</span>
                  <input type="number" min="0" max="99" value={borta} onChange={(e) => setBorta(e.target.value)} className="mc-input" placeholder="–" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onSpara(match.match_id, hemma, borta) }}
                  disabled={sparar || hemma === '' || borta === ''}
                  className={`mc-save ${harTips ? 'update' : 'new'}`}
                >
                  {sparar ? '...' : harTips ? 'Uppdatera' : 'Spara tips'}
                </button>
              </>
            ) : inloggad && tipsLåst && harTips ? (
              <div className="mc-score-locked">
                <span className="mc-score-box">{hemma}</span>
                <span className="mc-sep">–</span>
                <span className="mc-score-box">{borta}</span>
              </div>
            ) : (
              <span className="mc-vs">VS</span>
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