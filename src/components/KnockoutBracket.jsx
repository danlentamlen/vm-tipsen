import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFlag, formatTid, dagOffset, matchStartMs } from './MatchKort'
import BracketMatchModal from './BracketMatchModal'

// ── Rundan i visningsordning (ytterst → innerst) ────────────────────────────
export const ROUND_ORDER = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Final',
]

export const ROUND_LABELS = {
  'Round of 32':   'Sextondelsfinaler',
  'Round of 16':   'Åttondelsfinaler',
  'Quarter-final': 'Kvartsfinaler',
  'Semi-final':    'Semifinaler',
  'Final':         'Final',
}

// ── Korta etiketter för mobil omgångsväljare ────────────────────────────────
export const ROUND_SHORT = {
  'Round of 32':   'Sextondels',
  'Round of 16':   'Åttondels',
  'Quarter-final': 'Kvarts',
  'Semi-final':    'Semi',
  'Final':         'Final',
}

// ── Viewport-hook: bredd + orientering ──────────────────────────────────────
// Används för att växla mellan trädvy (desktop/liggande) och runda-för-runda
// (mobil stående). Påverkar aldrig desktop eftersom växlingen gated på bredd.
function useViewport() {
  const read = () => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    portrait:
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(orientation: portrait)').matches
        : true,
  })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onChange = () => setVp(read())
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])
  return vp
}

// ── FIFA VM 2026: korrekt visuell bracketordning ────────────────────────────
// Vi mappar INTE på match_id (arket kan numrera slutspelet hur som helst).
// Istället sorterar vi varje omgång stigande på match_id — vilket ger FIFA:s
// naturliga ordning (M73→M104) oavsett vilket talschema arket använder — och
// väljer sedan rätt rader till vänster/höger sida via POSITIONSINDEX.
//
// Adjacenta slots i varje kolumn möts i nästa omgång:
//   slot 0+1 → första matchen i nästa omgång, slot 2+3 → andra, osv.
//
// Index utgår från FIFA:s naturliga ordning per omgång:
//   R32  index 0..15 = M73..M88
//   R16  index 0..7  = M89..M96
//   QF   index 0..3  = M97..M100
//   SF   index 0..1  = M101,M102
const WC2026_POS = {
  left: {
    // M89=W74/W77, M90=W73/W75, M93=W83/W84, M94=W81/W82
    'Round of 32':   [1, 4, 0, 2, 10, 11, 8, 9],
    'Round of 16':   [0, 1, 4, 5],   // M89,M90,M93,M94
    'Quarter-final': [0, 1],          // M97,M98
    'Semi-final':    [0],             // M101
  },
  right: {
    // M91=W76/W78, M92=W79/W80, M95=W86/W88, M96=W85/W87
    'Round of 32':   [3, 5, 6, 7, 13, 15, 12, 14],
    'Round of 16':   [2, 3, 6, 7],   // M91,M92,M95,M96
    'Quarter-final': [2, 3],          // M99,M100
    'Semi-final':    [1],             // M102
  },
}

// ── Strukturera knockout-matcher i vänster/höger-halvor ─────────────────────
export function buildBracket(matcher) {
  const knockout = matcher.filter((m) => m.grupp === 'Slutspel')

  const byRound = {}
  ROUND_ORDER.forEach((r) => { byRound[r] = [] })
  knockout.forEach((m) => {
    const r = m.omgång || 'Slutspel'
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(m)
  })

  const activeRounds = ROUND_ORDER.filter((r) => byRound[r].length > 0)

  const left = {}
  const right = {}
  activeRounds.forEach((r) => {
    // Sortera stigande på match_id → FIFA:s naturliga ordning (M73→M104)
    const ms = byRound[r]
      .slice()
      .sort((a, b) => Number(a.match_id) - Number(b.match_id))

    if (r === 'Final') {
      // Finalen = matchen med högst match_id (utesluter ev. bronsmatch)
      left[r]  = ms.length ? [ms[ms.length - 1]] : []
      right[r] = []
      return
    }

    const leftPos  = WC2026_POS.left[r]  || []
    const rightPos = WC2026_POS.right[r] || []

    const leftMs  = leftPos.map((i) => ms[i]).filter(Boolean)
    const rightMs = rightPos.map((i) => ms[i]).filter(Boolean)

    if (leftMs.length === 0 && rightMs.length === 0) {
      // Fallback: oväntat antal matcher → halvera sekventiellt
      const half = Math.ceil(ms.length / 2)
      left[r]  = ms.slice(0, half)
      right[r] = ms.slice(half)
    } else {
      left[r]  = leftMs
      right[r] = rightMs
    }
  })

  return { byRound, left, right, activeRounds, knockout }
}

// ── Datum + tid för en bracket-cell (svensk tid) ────────────────────────────
const BKT_MÅN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatBracketNär(match) {
  if (!match?.datum) return ''
  const dm = String(match.datum).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!dm) return ''
  // Justera datumet för ev. midnattskorsning vid CEST-omvandling (samma som
  // matchlistan) så att datum och tid hör ihop.
  const d = new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3]))
  d.setUTCDate(d.getUTCDate() + dagOffset(match.tid))
  const datumStr = `${d.getUTCDate()} ${BKT_MÅN[d.getUTCMonth()]}`
  const tidStr = formatTid(match.tid)
  return tidStr ? `${datumStr} · ${tidStr}` : datumStr
}

// ── Hjälp: hämta resultat/live-ställning för en match ───────────────────────
function matchScore(match, matchStats, liveScores) {
  const s = matchStats?.[match.match_id]
  if (s?.resultat_hemma !== undefined) {
    return { hemma: s.resultat_hemma, borta: s.resultat_borta, klar: true, live: false }
  }
  const ls = liveScores?.find(
    (l) =>
      l.hemmalag?.toLowerCase().trim() === match.hemmalag?.toLowerCase().trim() &&
      l.bortalag?.toLowerCase().trim() === match.bortalag?.toLowerCase().trim()
  )
  if (ls && ls.hemma != null) {
    const live = ls.status !== 'FINISHED'
    return { hemma: ls.hemma, borta: ls.borta, klar: !live, live }
  }
  return null
}

function winner(match, score) {
  if (!score) return null
  if (score.hemma > score.borta) return match.hemmalag
  if (score.borta > score.hemma) return match.bortalag
  return null
}

// ── Vinnarkarta: hanterar OT/straffar via nästa omgångs lag ─────────────────
function buildWinnerMap(knockout, matchStats) {
  const map = {}
  knockout.forEach((m) => {
    const s = matchStats?.[m.match_id]
    if (!s) return

    // 1. Auktoritativt: admin-satt "vinnare" (H/A) i Resultat-arket. Detta är
    //    enda pålitliga källan vid straffar/förlängning — matchen kan sluta
    //    oavgjort men ett lag går ändå vidare. Samma fält som matchkortet visar.
    if (s.vinnare === 'H') { map[m.match_id] = m.hemmalag; return }
    if (s.vinnare === 'A') { map[m.match_id] = m.bortalag; return }

    // 2. Annars: avgör på ordinarie resultat.
    if (s.resultat_hemma === undefined || s.resultat_hemma === null) return
    if (s.resultat_hemma > s.resultat_borta) { map[m.match_id] = m.hemmalag; return }
    if (s.resultat_borta > s.resultat_hemma) { map[m.match_id] = m.bortalag; return }

    // 3. Oavgjort utan vinnare-flagga → laget som går vidare är det som dyker
    //    upp (med riktigt lagnamn, ej platshållare) i en SENARE match.
    const hem = m.hemmalag?.toLowerCase().trim()
    const bor = m.bortalag?.toLowerCase().trim()
    const mNum = Number(m.match_id)
    const ärPlatshållare = (n) => !n || n.includes('vinnare') || n.includes('winner')
    const senare = knockout
      .filter((nm) => Number(nm.match_id) > mNum)
      .sort((a, b) => Number(a.match_id) - Number(b.match_id))
    for (const nm of senare) {
      const riktiga = [nm.hemmalag, nm.bortalag]
        .map((n) => n?.toLowerCase().trim())
        .filter((n) => !ärPlatshållare(n))
      if (riktiga.includes(hem)) { map[m.match_id] = m.hemmalag; break }
      if (riktiga.includes(bor)) { map[m.match_id] = m.bortalag; break }
    }
  })
  return map
}

// ── Nästa ospelad match i bracketen ─────────────────────────────────────────
function findNextMatchId(knockout, matchStats, liveScores) {
  const liveIds = new Set(
    (liveScores || []).flatMap((ls) => {
      if (ls.status === 'FINISHED') return []
      const m = knockout.find(
        (m) =>
          m.hemmalag?.toLowerCase().trim() === ls.hemmalag?.toLowerCase().trim() &&
          m.bortalag?.toLowerCase().trim() === ls.bortalag?.toLowerCase().trim()
      )
      return m ? [m.match_id] : []
    })
  )
  let earliest = null, earliestMs = Infinity
  knockout.forEach((m) => {
    const s = matchStats?.[m.match_id]
    if ((s?.resultat_hemma !== undefined && s?.resultat_hemma !== null) || liveIds.has(m.match_id)) return
    // matchStartMs tolkar "HH:MM UTC±N" korrekt (den gamla new Date(...) gav NaN
    // för det formatet, så nästa match hittades aldrig).
    const ms = matchStartMs(m.datum, m.tid)
    if (ms == null) return
    if (ms < earliestMs) { earliestMs = ms; earliest = m.match_id }
  })
  return earliest
}

// ── En match-cell ─────────────────────────────────────────────────────────────
function MatchCell({ match, matchStats, liveScores, minaTips, compact, onClick, idPrefix, winnerOverride, isNext }) {
  if (!match) {
    // TBD-platshållare
    return (
      <div
        className={compact ? 'bkt-tbd' : 'bkt-tbd bkt-tbd-full'}
        id={idPrefix ? `${idPrefix}_empty` : undefined}
      >
        <div className="bkt-tbd-row">–</div>
        <div className="bkt-tbd-row">–</div>
      </div>
    )
  }

  const score  = matchScore(match, matchStats, liveScores)
  const win    = winnerOverride !== undefined ? winnerOverride : winner(match, score)
  const tip    = minaTips?.[match.match_id]
  const harTid = !match.hemmalag?.includes('Vinnare') && !match.bortalag?.includes('Vinnare')

  const hemmaVinner = win === match.hemmalag
  const bortaVinner = win === match.bortalag

  return (
    <div
      className={[
        compact ? 'bkt-match' : 'bkt-match bkt-match-full',
        score?.live ? 'bkt-live' : '',
        score?.klar ? 'bkt-done' : '',
        isNext ? 'bkt-next' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onClick(match)}
      id={idPrefix}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(match)}
    >
      {score?.live && <div className="bkt-live-bar" />}

      {/* Hemmalag */}
      <div className={['bkt-team', hemmaVinner ? 'bkt-winner' : bortaVinner ? 'bkt-eliminated' : ''].filter(Boolean).join(' ')}>
        <span className="bkt-flag">{getFlag(match.hemmalag)}</span>
        <span className="bkt-name">{match.hemmalag || '?'}</span>
        {score ? (
          <span className={['bkt-score', hemmaVinner ? 'bkt-score-win' : ''].filter(Boolean).join(' ')}>
            {score.hemma}
          </span>
        ) : (
          tip && <span className="bkt-tip">{tip.hemma_mål}</span>
        )}
      </div>

      {/* Bortalag */}
      <div className={['bkt-team', bortaVinner ? 'bkt-winner' : hemmaVinner ? 'bkt-eliminated' : ''].filter(Boolean).join(' ')}>
        <span className="bkt-flag">{getFlag(match.bortalag)}</span>
        <span className="bkt-name">{match.bortalag || '?'}</span>
        {score ? (
          <span className={['bkt-score', bortaVinner ? 'bkt-score-win' : ''].filter(Boolean).join(' ')}>
            {score.borta}
          </span>
        ) : (
          tip && <span className="bkt-tip">{tip.borta_mål}</span>
        )}
      </div>

      {/* Live-indikator */}
      {score?.live && (
        <div className="bkt-live-badge">
          <span className="bkt-live-dot" />
          Live
        </div>
      )}

      {/* Datum/tid-fot (full vy, ospelad match) + ev. NÄSTA-markör + TV-kanal */}
      {!compact && !score && match.datum && (
        <div className={['bkt-when', isNext ? 'bkt-when-next-row' : ''].filter(Boolean).join(' ')}>
          {isNext && <span className="bkt-when-next">NÄSTA</span>}
          <span className="bkt-when-txt">{formatBracketNär(match)}</span>
          {match.kanal && <span className="bkt-kanal">{match.kanal}</span>}
        </div>
      )}

      {/* Kompakt widget: liten NÄSTA-markör */}
      {compact && isNext && !score?.live && (
        <div className="bkt-next-badge">NÄSTA</div>
      )}
    </div>
  )
}

// ── Är namnet ett riktigt lag (inte en platshållare)? ───────────────────────
// Platshållare = "Vinnare semifinal 1", "Winner ...", bracketkoder "W101"/"L102",
// grupp-koder "1A"/"2B"/"3E". Riktiga lagnamn ska alltid visas.
export function ärRiktigtLag(namn) {
  if (!namn) return false
  const n = namn.toLowerCase().trim()
  if (n.includes('vinnare') || n.includes('winner') ||
      n.includes('förlorare') || n.includes('forlorare') || n.includes('loser')) return false
  if (/^[wl]\d+$/i.test(n)) return false
  if (/^[12][a-l]$/i.test(n)) return false
  if (/^3[a-l]/i.test(n)) return false
  return true
}

// ── Mini-resultat: två lagrader (flagga + namn + ev. mål) ────────────────────
// Används för finalist-boxen och bronsmatchen — visar lagen så snart de är kända,
// oberoende av om matchen har spelats än.
function MiniResultat({ match, score, winnerNamn, fullMode }) {
  if (!match) return <span className="bkt-finalist-val">– vs –</span>
  const lag = [match.hemmalag, match.bortalag]
  return (
    <div className="bkt-fr" style={{ marginTop: 3 }}>
      {lag.map((namn, idx) => {
        const riktig    = ärRiktigtLag(namn)
        const ärVinnare = winnerNamn && winnerNamn === namn
        const ärUtslagen = winnerNamn && riktig && !ärVinnare
        const mål = score ? (idx === 0 ? score.hemma : score.borta) : null
        return (
          <div
            key={idx}
            className={['bkt-fr-row', ärVinnare ? 'bkt-fr-win' : ärUtslagen ? 'bkt-fr-lose' : ''].filter(Boolean).join(' ')}
            style={{ fontSize: fullMode ? 13 : 11 }}
          >
            <span className="bkt-fr-flag">{riktig ? getFlag(namn) : ''}</span>
            <span className="bkt-fr-name">{riktig ? namn : '–'}</span>
            {mål != null && <span className="bkt-fr-score">{mål}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── SVG connector-ritare ─────────────────────────────────────────────────────
function drawConnectors(svgEl, pairs, targets, dir) {
  if (!svgEl) return
  svgEl.innerHTML = ''
  const svgRect = svgEl.getBoundingClientRect()
  if (!svgRect.width) return

  pairs.forEach((pair, i) => {
    const target = targets[i]
    if (!pair[0] || !pair[1] || !target) return
    const aR = pair[0].getBoundingClientRect()
    const bR = pair[1].getBoundingClientRect()
    const tR = target.getBoundingClientRect()
    if (!aR.width || !tR.width) return

    const oy = svgRect.top
    const ox = svgRect.left

    const ay = (aR.top + aR.bottom) / 2 - oy
    const by = (bR.top + bR.bottom) / 2 - oy
    const ty = (tR.top + tR.bottom) / 2 - oy
    const midY = (ay + by) / 2

    let ax, bx, tx, mx

    if (dir === 'ltr') {
      ax = aR.right - ox
      bx = bR.right - ox
      tx = tR.left - ox
      mx = ax + (tx - ax) * 0.5
    } else {
      ax = aR.left - ox
      bx = bR.left - ox
      tx = tR.right - ox
      mx = ax + (tx - ax) * 0.5
    }

    const hasData =
      pair[0].classList?.contains('bkt-done') ||
      pair[0].classList?.contains('bkt-live') ||
      pair[1].classList?.contains('bkt-done') ||
      pair[1].classList?.contains('bkt-live')

    const cls = hasData ? 'bkt-line bkt-line-active' : 'bkt-line'

    function line(x1, y1, x2, y2) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      el.setAttribute('x1', x1); el.setAttribute('y1', y1)
      el.setAttribute('x2', x2); el.setAttribute('y2', y2)
      el.setAttribute('class', cls)
      svgEl.appendChild(el)
    }

    if (dir === 'ltr') {
      line(ax, ay, mx, ay)
      line(bx, by, mx, by)
      line(mx, ay, mx, by)
      line(mx, midY, tx, ty) // anslut mitten → target Y
      // Vertikal justeringslinje om ty !== midY
      if (Math.abs(ty - midY) > 2) {
        line(mx, midY, mx, ty)
      }
    } else {
      line(ax, ay, mx, ay)
      line(bx, by, mx, by)
      line(mx, ay, mx, by)
      if (Math.abs(ty - midY) > 2) {
        line(mx, midY, mx, ty)
      }
      line(mx, ty, tx, ty)
    }
  })
}

// ── CSS-strängen som injiceras en gång ───────────────────────────────────────
const BRACKET_CSS = `
  .bkt-wrap { position:relative; padding:10px 12px 14px; }

  /* ── Match-kort ── */
  .bkt-match {
    background:rgba(255,255,255,.045);
    border:1px solid rgba(255,255,255,.09);
    border-radius:5px;
    overflow:hidden;
    cursor:pointer;
    transition:border-color .15s, background .15s;
    position:relative;
  }
  .bkt-match:hover { border-color:rgba(255,255,255,.22); background:rgba(255,255,255,.07); }
  .bkt-match:focus-visible { outline:2px solid #C5A028; outline-offset:2px; }
  .bkt-match-full { border-radius:7px; }
  .bkt-match.bkt-live  { border-color:rgba(200,16,46,.55); }
  .bkt-match.bkt-done  { }

  .bkt-live-bar {
    height:2px;
    background:linear-gradient(90deg,#C8102E,#ff4060,#C8102E);
    background-size:200% 100%;
    animation:bkt-shimmer 2s linear infinite;
  }
  @keyframes bkt-shimmer { 0%{background-position:0%} 100%{background-position:200%} }

  /* ── Team-rader ── */
  .bkt-team {
    display:flex;
    align-items:center;
    gap:3px;
    padding:2px 5px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:10px;
    font-weight:600;
    letter-spacing:.03em;
    color:rgba(255,255,255,.48);
    line-height:1.25;
  }
  .bkt-match-full .bkt-team { font-size:12px; padding:5px 8px; gap:6px; }
  .bkt-team + .bkt-team { border-top:1px solid rgba(255,255,255,.05); }
  .bkt-winner   { color:#fff !important; background:rgba(240,208,96,.08); }
  .bkt-eliminated { opacity:.22 !important; }
  .bkt-flag { font-size:9px; flex-shrink:0; }
  .bkt-match-full .bkt-flag { font-size:13px; }
  .bkt-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bkt-score { font-size:9px; font-weight:700; color:rgba(255,255,255,.35); flex-shrink:0; min-width:12px; text-align:right; }
  .bkt-match-full .bkt-score { font-size:12px; }
  .bkt-score-win { color:#F0D060 !important; }
  .bkt-tip { font-size:9px; font-weight:600; color:rgba(197,160,40,.5); flex-shrink:0; }

  /* ── Live-badge ── */
  .bkt-live-badge {
    position:absolute; top:2px; right:4px;
    display:flex; align-items:center; gap:3px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:7px; font-weight:800; letter-spacing:.1em;
    color:#ff4060; text-transform:uppercase;
  }
  .bkt-live-dot {
    width:4px; height:4px; border-radius:50%; background:#ff4060;
    animation:bkt-pulse 1.1s ease infinite;
  }
  @keyframes bkt-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ── TBD-platshållare ── */
  .bkt-tbd {
    border:1px dashed rgba(255,255,255,.07);
    border-radius:5px;
    padding:2px 5px;
  }
  .bkt-tbd-full { border-radius:7px; padding:5px 8px; }
  .bkt-tbd-row {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; color:rgba(255,255,255,.18);
    padding:1px 0; font-style:italic;
  }
  .bkt-match-full .bkt-tbd-row + .bkt-tbd-row,
  .bkt-tbd-full .bkt-tbd-row + .bkt-tbd-row { border-top:1px solid rgba(255,255,255,.04); padding-top:4px; margin-top:4px; }

  /* ── SVG connector-linjer ── */
  .bkt-svg { position:absolute; inset:0; pointer-events:none; overflow:visible; }
  .bkt-line { stroke:rgba(197,160,40,.13); stroke-width:1; fill:none; }
  .bkt-line-active { stroke:rgba(197,160,40,.35); }

  /* ── Rundetiketter ── */
  .bkt-round-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:7px; font-weight:700; letter-spacing:.18em;
    text-transform:uppercase; color:rgba(255,255,255,.2);
    text-align:center; margin-bottom:5px;
    padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,.06);
  }
  .bkt-round-lbl-full { font-size:8px; margin-bottom:7px; padding-bottom:5px; }

  /* ── Center-trofé ── */
  .bkt-center {
    display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px;
    text-align:center;
  }
  .bkt-trophy { font-size:22px; line-height:1; }
  .bkt-trophy-full { font-size:32px; }
  .bkt-final-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:8px; font-weight:700; letter-spacing:.18em;
    text-transform:uppercase; color:#C5A028;
  }
  .bkt-final-date {
    font-family:'Barlow',sans-serif;
    font-size:7px; color:rgba(255,255,255,.2); letter-spacing:.04em;
  }
  .bkt-finalist-box {
    background:rgba(197,160,40,.08);
    border:1px solid rgba(197,160,40,.18);
    border-radius:5px; padding:4px 7px; margin-top:4px; width:100%;
  }
  .bkt-finalist-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:7px; font-weight:700; letter-spacing:.14em;
    text-transform:uppercase; color:rgba(255,255,255,.25); display:block;
  }
  .bkt-finalist-val {
    font-family:'Barlow Condensed',sans-serif;
    font-size:11px; font-weight:700; color:rgba(255,255,255,.45);
  }

  /* ── Finalist/brons mini-rader ── */
  .bkt-fr { display:flex; flex-direction:column; gap:2px; }
  .bkt-fr-row {
    display:flex; align-items:center; gap:4px;
    font-family:'Barlow Condensed',sans-serif; font-weight:700;
    color:rgba(255,255,255,.5); line-height:1.2;
  }
  .bkt-fr-flag { flex-shrink:0; }
  .bkt-fr-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:left; }
  .bkt-fr-score { flex-shrink:0; font-weight:800; color:#F0D060; }
  .bkt-fr-win  { color:#fff !important; }
  .bkt-fr-lose { opacity:.4; }

  /* ── Bronsmatch-box (center, under finalen) ── */
  .bkt-bronze-box {
    background:rgba(205,127,50,.08);
    border:1px solid rgba(205,127,50,.22);
    border-radius:5px; padding:4px 7px; margin-top:6px; width:100%;
    cursor:pointer; transition:border-color .15s, background .15s;
  }
  .bkt-bronze-box:hover { border-color:rgba(205,127,50,.4); background:rgba(205,127,50,.12); }
  .bkt-bronze-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:7px; font-weight:700; letter-spacing:.1em;
    text-transform:uppercase; color:rgba(205,127,50,.85); display:block; margin-bottom:1px;
  }

  /* ── Kompakt grid ── */
  .bkt-grid-compact {
    display:grid;
    align-items:stretch;
  }
  .bkt-col { display:flex; flex-direction:column; justify-content:space-around; gap:2px; }
  .bkt-conn { position:relative; }

  /* ── Full grid ── */
  .bkt-grid-full {
    display:grid;
    align-items:stretch;
    min-width:580px;
  }

  /* ── Widget-header ── */
  .bkt-widget-hdr {
    padding:10px 14px 0;
    display:flex; align-items:center; justify-content:space-between;
  }
  .bkt-widget-lbl {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.22em;
    text-transform:uppercase; color:rgba(255,255,255,.25);
  }
  .bkt-widget-link {
    font-family:'Barlow Condensed',sans-serif;
    font-size:10px; font-weight:700; letter-spacing:.1em;
    text-transform:uppercase; color:#C5A028;
    text-decoration:none; display:flex; align-items:center; gap:4px;
    transition:color .15s;
  }
  .bkt-widget-link:hover { color:#F0D060; }

  /* ── Full page header ── */
  .bkt-page-hdr {
    text-align:center; margin-bottom:16px;
    padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.07);
  }
  .bkt-page-eyebrow {
    font-family:'Barlow Condensed',sans-serif;
    font-size:9px; font-weight:700; letter-spacing:.25em;
    text-transform:uppercase; color:rgba(197,160,40,.5); margin-bottom:4px;
  }
  .bkt-page-title {
    font-family:'Barlow Condensed',sans-serif;
    font-size:30px; font-weight:800; letter-spacing:.1em;
    text-transform:uppercase; color:#fff; line-height:.95;
  }
  .bkt-page-title em { color:#F0D060; font-style:normal; }

  /* ── Nästa match ── */
  .bkt-next {
    border-color:rgba(197,160,40,.45) !important;
    box-shadow:0 0 0 1px rgba(197,160,40,.18), inset 0 0 10px rgba(197,160,40,.04);
  }
  .bkt-next::before {
    content:''; position:absolute; left:0; top:0; bottom:0;
    width:2px; background:#C5A028; border-radius:2px 0 0 2px;
  }
  .bkt-next-badge {
    position:absolute; bottom:2px; right:4px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:6px; font-weight:800; letter-spacing:.12em;
    text-transform:uppercase; color:rgba(197,160,40,.9);
    background:rgba(197,160,40,.1); padding:1px 3px; border-radius:2px;
  }

  /* ── Datum/tid-fot ── */
  .bkt-when {
    display:flex; align-items:center; gap:5px;
    padding:3px 8px; border-top:1px solid rgba(255,255,255,.05);
    font-family:'Barlow Condensed',sans-serif;
    font-size:9.5px; font-weight:600; letter-spacing:.04em;
    color:rgba(255,255,255,.34);
  }
  .bkt-when-next-row { color:rgba(240,208,96,.9); }
  .bkt-when-next {
    font-size:8px; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
    color:#07101f; background:#F0D060; border-radius:3px; padding:1px 5px;
  }
  .bkt-when-txt { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bkt-kanal {
    margin-left:auto; flex-shrink:0;
    font-size:8px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
    color:rgba(255,255,255,.55); background:rgba(255,255,255,.08);
    border-radius:3px; padding:1px 5px;
  }
  .bkt-when-next-row .bkt-kanal { color:rgba(240,208,96,.95); background:rgba(240,208,96,.12); }

  /* ── Centrera bracket-griden ── */
  .bkt-grid-full, .bkt-grid-compact {
    margin-left:auto; margin-right:auto;
  }

  /* ── Mobil stående ── */
  @media (max-width:480px) {
    .bkt-grid-full { min-width:480px; }
  }

  /* ── Mobil liggande ── */
  @media (orientation:landscape) and (max-height:500px) {
    .bkt-grid-full { min-width:0; }
    .bkt-wrap { padding:4px 8px 8px; }
    .bkt-match-full .bkt-team { font-size:10px; padding:3px 5px; gap:4px; }
    .bkt-match-full .bkt-flag { font-size:11px; }
    .bkt-match-full .bkt-score { font-size:10px; }
    .bkt-round-lbl-full { font-size:6px; margin-bottom:3px; padding-bottom:3px; }
    .bkt-trophy-full { font-size:20px; }
    .bkt-final-lbl { font-size:7px; }
    .bkt-final-date { display:none; }
    .bkt-finalist-box { padding:2px 5px; }
    .bkt-finalist-val { font-size:9px; }
    .bkt-page-hdr { margin-bottom:8px; padding-bottom:6px; }
    .bkt-page-title { font-size:22px; }
    .bkt-page-eyebrow { font-size:7px; }
  }

  /* ── Mobil stående: runda-för-runda ── */
  .bkt-mob { padding:2px 10px 22px; max-width:460px; margin:0 auto; }
  .bkt-mpills {
    display:flex; gap:6px; overflow-x:auto; padding:8px 2px 12px;
    -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .bkt-mpills::-webkit-scrollbar { display:none; }
  .bkt-mpill {
    flex:0 0 auto; font-family:'Barlow Condensed',sans-serif;
    font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
    color:rgba(255,255,255,.42); background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.09); border-radius:20px;
    padding:8px 14px; cursor:pointer; white-space:nowrap;
    transition:color .15s, background .15s, border-color .15s;
  }
  .bkt-mpill:hover { color:rgba(255,255,255,.7); }
  .bkt-mpill:focus-visible { outline:2px solid #C5A028; outline-offset:2px; }
  .bkt-mpill-on { color:#07101f !important; background:#F0D060; border-color:#F0D060; }
  .bkt-mrhdr { display:flex; align-items:baseline; justify-content:space-between; padding:2px 2px 8px; }
  .bkt-mrname {
    font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;
    letter-spacing:.14em; text-transform:uppercase; color:#C5A028;
  }
  .bkt-mrcount { font-family:'Barlow',sans-serif; font-size:11px; color:rgba(255,255,255,.3); }
  .bkt-mhalf {
    font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:700;
    letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.24);
    margin:11px 2px 7px; border-top:1px solid rgba(255,255,255,.06); padding-top:9px;
  }
  .bkt-mhalf-first { border-top:none; padding-top:0; margin-top:2px; }
  .bkt-mcard { margin-bottom:9px; }
  .bkt-mfinal {
    background:rgba(197,160,40,.07); border:1px solid rgba(197,160,40,.22);
    border-radius:10px; padding:18px; text-align:center;
  }
  .bkt-mfinal .bkt-trophy-full { font-size:30px; }
`

// ── Mobil stående: runda-för-runda-vy ───────────────────────────────────────
function MobileBracket({
  rounds, left, right, finalMatch, finalScore, finalWinner,
  bronsMatch, bronsScore, bronsWinner,
  matchStats, liveScores, minaTips, winnerMap, nextMatchId, onSelect,
}) {
  // Starta på den omgång som innehåller nästa match (annars första omgången)
  const initial = Math.max(
    0,
    rounds.findIndex((r) =>
      r !== 'Final' &&
      [...(left[r] || []), ...(right[r] || [])].some((m) => m?.match_id === nextMatchId)
    )
  )
  const [sel, setSel] = useState(initial)
  const round = rounds[sel] || rounds[0]

  function cards(ms) {
    return ms.map((m, i) => (
      <div className="bkt-mcard" key={m ? m.match_id : i}>
        <MatchCell
          match={m}
          matchStats={matchStats}
          liveScores={liveScores}
          minaTips={minaTips}
          compact={false}
          onClick={onSelect}
          winnerOverride={winnerMap[m?.match_id]}
          isNext={m?.match_id === nextMatchId}
        />
      </div>
    ))
  }

  const leftMs  = round === 'Final' ? [] : (left[round] || [])
  const rightMs = round === 'Final' ? [] : (right[round] || [])
  const visaHalvor = leftMs.length > 0 && rightMs.length > 0
  const antal = leftMs.length + rightMs.length

  return (
    <div className="bkt-mob">
      <div className="bkt-mpills" role="tablist" aria-label="Omgångar">
        {rounds.map((r, i) => (
          <button
            key={r}
            role="tab"
            aria-selected={i === sel}
            className={['bkt-mpill', i === sel ? 'bkt-mpill-on' : ''].filter(Boolean).join(' ')}
            onClick={() => setSel(i)}
          >
            {ROUND_SHORT[r] || r}
          </button>
        ))}
      </div>

      {round === 'Final' ? (
        <div
          className="bkt-mfinal"
          style={{ cursor: finalMatch ? 'pointer' : 'default' }}
          onClick={() => finalMatch && onSelect(finalMatch)}
          role={finalMatch ? 'button' : undefined}
          tabIndex={finalMatch ? 0 : undefined}
        >
          <div className="bkt-trophy bkt-trophy-full">🏆</div>
          <div className="bkt-final-lbl">Final · 19 juli 2026</div>
          <div className="bkt-final-date">MetLife Stadium, NJ</div>
          <div style={{ marginTop: 12 }}>
            <MiniResultat match={finalMatch} score={finalScore} winnerNamn={finalWinner} fullMode />
          </div>

          {bronsMatch && (
            <div
              className="bkt-bronze-box"
              style={{ marginTop: 14 }}
              onClick={(e) => { e.stopPropagation(); onSelect(bronsMatch) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onSelect(bronsMatch))}
            >
              <span className="bkt-bronze-lbl">🥉 Match om 3:e plats</span>
              <MiniResultat match={bronsMatch} score={bronsScore} winnerNamn={bronsWinner} fullMode />
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bkt-mrhdr">
            <span className="bkt-mrname">{ROUND_LABELS[round] || round}</span>
            <span className="bkt-mrcount">{antal} {antal === 1 ? 'match' : 'matcher'}</span>
          </div>
          {visaHalvor && <div className="bkt-mhalf bkt-mhalf-first">Övre halva</div>}
          {cards(leftMs)}
          {visaHalvor && <div className="bkt-mhalf">Undre halva</div>}
          {cards(rightMs)}
        </>
      )}
    </div>
  )
}

// ── Huvud-komponent ──────────────────────────────────────────────────────────
export default function KnockoutBracket({
  matcher = [],
  matchStats = {},
  liveScores = [],
  minaTips = {},
  inloggad = false,
  compact = false,    // true = hem-widget, false = full sida
}) {
  const [valdMatch, setValdMatch] = useState(null)
  const svgRefs    = useRef({})   // { key: SVGElement }
  const matchRefs  = useRef({})   // { id: HTMLElement }
  const wrapRef    = useRef(null)
  const vp         = useViewport()

  const { left, right, activeRounds, knockout, byRound } = buildBracket(matcher)
  const winnerMap   = buildWinnerMap(knockout, matchStats)
  const nextMatchId = findNextMatchId(knockout, matchStats, liveScores)

  // Hitta slutspelsmatcher live för banner
  const liveSlutspel = liveScores.filter((ls) =>
    matcher.some(
      (m) =>
        m.grupp === 'Slutspel' &&
        m.hemmalag?.toLowerCase().trim() === ls.hemmalag?.toLowerCase().trim() &&
        m.bortalag?.toLowerCase().trim() === ls.bortalag?.toLowerCase().trim() &&
        ls.status !== 'FINISHED'
    )
  )

  // Rundan utan Final (visas i center)
  const bracketRounds = activeRounds.filter((r) => r !== 'Final')
  const finalMatch = left['Final']?.[0] || null
  const finalScore = finalMatch ? matchScore(finalMatch, matchStats, liveScores) : null
  // winnerMap är auktoritativ (klarar straffar/förlängning); fall tillbaka på mål.
  const finalWinner = finalMatch
    ? (winnerMap[finalMatch.match_id] || (finalScore ? winner(finalMatch, finalScore) : null))
    : null

  // Bronsmatch (Match for third place) — ingår inte i ROUND_ORDER, hämtas separat.
  const bronsMatch = byRound?.['Match for third place']?.[0] || null
  const bronsScore = bronsMatch ? matchScore(bronsMatch, matchStats, liveScores) : null
  const bronsWinner = bronsMatch
    ? (winnerMap[bronsMatch.match_id] || (bronsScore ? winner(bronsMatch, bronsScore) : null))
    : null

  // ── Connector-ritning ────────────────────────────────────────────────────
  const ritaLinjer = useCallback(() => {
    if (!wrapRef.current) return
    const wrap = wrapRef.current

    // Vänster sida: koppla par i kolumnen N → enskilt i kolumnen N+1
    for (let ri = 0; ri < bracketRounds.length - 1; ri++) {
      const thisRound = bracketRounds[ri]
      const nextRound = bracketRounds[ri + 1]
      const svgKey = `l-${ri}`
      const svgEl = svgRefs.current[svgKey]
      if (!svgEl) continue

      const fromMatches = left[thisRound] || []
      const toMatches   = left[nextRound] || []

      const pairs = []
      const targets = []
      for (let i = 0; i < toMatches.length; i++) {
        const a = matchRefs.current[`L_${thisRound}_${i * 2}`]
        const b = matchRefs.current[`L_${thisRound}_${i * 2 + 1}`]
        const t = matchRefs.current[`L_${nextRound}_${i}`]
        if (a && b && t) { pairs.push([a, b]); targets.push(t) }
      }
      drawConnectors(svgEl, pairs, targets, 'ltr')
    }

    // Höger sida
    for (let ri = 0; ri < bracketRounds.length - 1; ri++) {
      const thisRound = bracketRounds[ri]
      const nextRound = bracketRounds[ri + 1]
      const svgKey = `r-${ri}`
      const svgEl = svgRefs.current[svgKey]
      if (!svgEl) continue

      const toMatches = right[nextRound] || []

      const pairs = []
      const targets = []
      for (let i = 0; i < toMatches.length; i++) {
        const a = matchRefs.current[`R_${thisRound}_${i * 2}`]
        const b = matchRefs.current[`R_${thisRound}_${i * 2 + 1}`]
        const t = matchRefs.current[`R_${nextRound}_${i}`]
        if (a && b && t) { pairs.push([a, b]); targets.push(t) }
      }
      drawConnectors(svgEl, pairs, targets, 'rtl')
    }

    // Innerst: SF → Final (center)
    const innermost = bracketRounds[bracketRounds.length - 1]
    if (innermost && finalMatch) {
      const centerEl = matchRefs.current['CENTER']
      const svgElL = svgRefs.current['l-center']
      const svgElR = svgRefs.current['r-center']

      ;[
        { svgEl: svgElL, side: left, dir: 'ltr' },
        { svgEl: svgElR, side: right, dir: 'rtl' },
      ].forEach(({ svgEl, side, dir }) => {
        if (!svgEl || !centerEl) return
        const sideMatches = side[innermost] || []
        if (!sideMatches.length) return

        svgEl.innerHTML = ''
        const svgRect = svgEl.getBoundingClientRect()
        const centerRect = centerEl.getBoundingClientRect()
        if (!svgRect.width || !centerRect.width) return

        const prefix = dir === 'ltr' ? 'L' : 'R'
        sideMatches.forEach((_, i) => {
          const el = matchRefs.current[`${prefix}_${innermost}_${i}`]
          if (!el) return
          const eR  = el.getBoundingClientRect()
          const cR  = centerRect
          const oy  = svgRect.top
          const ox  = svgRect.left
          const ey  = (eR.top + eR.bottom) / 2 - oy
          const cy  = (cR.top + cR.bottom) / 2 - oy
          const ex  = dir === 'ltr' ? eR.right - ox : eR.left - ox
          const cx  = dir === 'ltr' ? cR.left - ox  : cR.right - ox
          const mx  = ex + (cx - ex) * 0.5

          const hasData = el.classList.contains('bkt-done') || el.classList.contains('bkt-live')
          const cls = hasData ? 'bkt-line bkt-line-active' : 'bkt-line'

          function ln(x1, y1, x2, y2) {
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
            l.setAttribute('x1', x1); l.setAttribute('y1', y1)
            l.setAttribute('x2', x2); l.setAttribute('y2', y2)
            l.setAttribute('class', cls)
            svgEl.appendChild(l)
          }
          ln(ex, ey, mx, ey)
          if (Math.abs(cy - ey) > 2) ln(mx, ey, mx, cy)
          ln(mx, cy, cx, cy)
        })
      })
    }
  }, [bracketRounds, left, right, finalMatch])

  useEffect(() => {
    const timer = setTimeout(ritaLinjer, 80)
    const onOrient = () => setTimeout(ritaLinjer, 300)
    window.addEventListener('resize', ritaLinjer)
    window.addEventListener('orientationchange', onOrient)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', ritaLinjer)
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [ritaLinjer, matcher, matchStats, liveScores])

  // ── Grid-konfiguration ────────────────────────────────────────────────────
  const numRounds = bracketRounds.length // 0–3 (ex: R16, QF, SF = 3)

  // Mobil liggande: krymp kolumnerna så hela trädet får plats på bredden.
  // (Connectorlinjerna ritas från faktiska layoutpositioner → följer med.)
  const isMobileLandscape = !compact && vp.w <= 900 && !vp.portrait

  // Kolumnbredder: r16, conn, qf, conn, sf, conn, center, conn, sf, conn, qf, conn, r16
  const colWidths = compact
    ? { r16: 82, qf: 72, sf: 62, center: 70 }
    : isMobileLandscape
      ? { r16: 74, qf: 62, sf: 54, center: 62 }
      : { r16: 106, qf: 94, sf: 80, center: 90 }

  // Bygg grid-template-columns beroende på hur många omgångar som finns
  function buildGridCols() {
    const CONN = compact || isMobileLandscape ? 7 : 10
    const sizes = []
    const roundNames = [...bracketRounds] // ytterst → innerst

    // Vänster sida
    roundNames.forEach((r, i) => {
      const w = i === 0 ? colWidths.r16 : i === 1 ? colWidths.qf : colWidths.sf
      sizes.push(`${w}px`)
      if (i < roundNames.length - 1) sizes.push(`${CONN}px`)
    })
    // Center-kolumn
    if (roundNames.length) sizes.push(`${CONN}px`)
    sizes.push(`${colWidths.center}px`)
    // Höger sida (speglad)
    if (roundNames.length) sizes.push(`${CONN}px`)
    const roundNamesR = [...roundNames].reverse()
    roundNamesR.forEach((r, i) => {
      const orig = roundNamesR.length - 1 - i
      const w = orig === 0 ? colWidths.r16 : orig === 1 ? colWidths.qf : colWidths.sf
      if (i > 0) sizes.push(`${CONN}px`)
      sizes.push(`${w}px`)
    })

    return sizes.join(' ')
  }

  const gridCols = buildGridCols()

  // ── Registrera ref för match-element ─────────────────────────────────────
  function matchRef(key) {
    return (el) => { matchRefs.current[key] = el }
  }
  function svgRef(key) {
    return (el) => { svgRefs.current[key] = el }
  }

  // ── Minsta höjd för att ge rättig vertikalfördelning ────────────────────
  const firstRoundCount = bracketRounds.length
    ? (left[bracketRounds[0]]?.length || 0)
    : 0
  const minH = compact
    ? Math.max(220, firstRoundCount * 30)
    : isMobileLandscape
      ? Math.max(280, firstRoundCount * 36)
      : Math.max(340, firstRoundCount * 50)

  // ── Rendrera en kolumn av matcher (vänster eller höger) ─────────────────
  function renderCol(round, side, prefix, fullMode) {
    const matches = side[round] || []
    // Fyll upp med nulls till närmaste jämnt antal om färre slots (för parning)
    return (
      <div className="bkt-col">
        <div className={fullMode ? 'bkt-round-lbl bkt-round-lbl-full' : 'bkt-round-lbl'}>
          {ROUND_LABELS[round] || round}
        </div>
        {matches.map((m, i) => (
          <div key={m ? m.match_id : i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%' }} ref={matchRef(`${prefix}_${round}_${i}`)}>
              <MatchCell
                match={m}
                matchStats={matchStats}
                liveScores={liveScores}
                minaTips={minaTips}
                compact={compact}
                onClick={setValdMatch}
                idPrefix={`${prefix}_${round}_${i}`}
                winnerOverride={winnerMap[m?.match_id]}
                isNext={m?.match_id === nextMatchId}
              />
            </div>
          </div>
        ))}
        {matches.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div className={compact ? 'bkt-tbd' : 'bkt-tbd bkt-tbd-full'} style={{ width: '100%' }}>
              <div className="bkt-tbd-row">–</div>
              <div className="bkt-tbd-row">–</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── DOM-utseende beroende på läge ────────────────────────────────────────
  const fullMode = !compact

  // Mobil stående → runda-för-runda. Liggande/desktop → trädvy (orört).
  // Gated på bredd så desktop aldrig påverkas.
  const mobilePortrait = fullMode && vp.w <= 600 && vp.portrait
  const mobileRounds = (finalMatch || bronsMatch) ? [...bracketRounds, 'Final'] : [...bracketRounds]

  return (
    <>
      <style>{BRACKET_CSS}</style>

      {/* Widget-header (kompakt läge) */}
      {compact && (
        <div className="bkt-widget-hdr">
          <span className="bkt-widget-lbl">Slutspelsträd</span>
          <Link to="/slutspel" className="bkt-widget-link">
            Detaljer <span style={{ fontSize: 12 }}>→</span>
          </Link>
        </div>
      )}

      {/* Full page header */}
      {fullMode && (
        <div className="bkt-page-hdr">
          <div className="bkt-page-eyebrow">FIFA World Cup 2026</div>
          <div className="bkt-page-title">SLUT<em>SPEL</em></div>
        </div>
      )}

      {/* Mobil stående: runda-för-runda */}
      {mobilePortrait && (
        <MobileBracket
          rounds={mobileRounds}
          left={left}
          right={right}
          finalMatch={finalMatch}
          finalScore={finalScore}
          finalWinner={finalWinner}
          bronsMatch={bronsMatch}
          bronsScore={bronsScore}
          bronsWinner={bronsWinner}
          matchStats={matchStats}
          liveScores={liveScores}
          minaTips={minaTips}
          winnerMap={winnerMap}
          nextMatchId={nextMatchId}
          onSelect={setValdMatch}
        />
      )}

      {/* Bracket wrap (desktop + mobil liggande) */}
      {!mobilePortrait && (
      <div className="bkt-wrap" ref={wrapRef} style={{ overflowX: 'auto' }}>
        <div
          className={compact ? 'bkt-grid-compact' : 'bkt-grid-full'}
          style={{
            gridTemplateColumns: gridCols,
            alignItems: 'stretch',
            minHeight: minH,
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {/* ── Vänster sida: ytterst → innerst ── */}
          {bracketRounds.map((round, ri) => (
            <React.Fragment key={`l-${ri}`}>
              {renderCol(round, left, 'L', fullMode)}
              {/* Connector-kolumn */}
              <div className="bkt-conn">
                <svg
                  className="bkt-svg"
                  ref={svgRef(`l-${ri}`)}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </React.Fragment>
          ))}

          {/* ── Center: Final + trofé ── */}
          <div className="bkt-center">
            <div className={fullMode ? 'bkt-round-lbl bkt-round-lbl-full' : 'bkt-round-lbl'} style={{ width: '100%' }}>
              Final
            </div>
            <div className={fullMode ? 'bkt-trophy bkt-trophy-full' : 'bkt-trophy'}>🏆</div>
            <div className="bkt-final-lbl">19 juli 2026</div>
            <div className="bkt-final-date">MetLife Stadium, NJ</div>

            {/* Finalist-box — visar finalisterna så snart de är kända */}
            {finalMatch && (
              <div
                className="bkt-finalist-box"
                ref={matchRef('CENTER')}
                style={{ cursor: 'pointer' }}
                onClick={() => finalMatch && setValdMatch(finalMatch)}
              >
                <span className="bkt-finalist-lbl">Finalister</span>
                <MiniResultat match={finalMatch} score={finalScore} winnerNamn={finalWinner} fullMode={fullMode} />
              </div>
            )}

            {/* Bronsmatch — Match om 3:e plats */}
            {bronsMatch && (
              <div
                className="bkt-bronze-box"
                onClick={() => setValdMatch(bronsMatch)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setValdMatch(bronsMatch)}
              >
                <span className="bkt-bronze-lbl">🥉 Match om 3:e plats</span>
                <MiniResultat match={bronsMatch} score={bronsScore} winnerNamn={bronsWinner} fullMode={fullMode} />
              </div>
            )}
          </div>

          {/* ── Höger sida: innerst → ytterst ── */}
          {/* Extra connector till center */}
          <div className="bkt-conn">
            <svg className="bkt-svg" ref={svgRef('r-center')} style={{ width: '100%', height: '100%' }} />
          </div>

          {[...bracketRounds].reverse().map((round, ri) => (
            <React.Fragment key={`r-${ri}`}>
              {/* Connector */}
              {ri > 0 && (
                <div className="bkt-conn">
                  <svg
                    className="bkt-svg"
                    ref={svgRef(`r-${bracketRounds.length - 1 - ri}`)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              )}
              {renderCol(round, right, 'R', fullMode)}
            </React.Fragment>
          ))}
        </div>

        {/* Global SVG overlay (vänster SF → center) */}
        <svg
          className="bkt-svg"
          ref={svgRef('l-center')}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        />
      </div>
      )}

      {/* Match-modal */}
      {valdMatch && (
        <BracketMatchModal
          match={valdMatch}
          matchStats={matchStats[valdMatch.match_id] || null}
          liveScores={liveScores}
          tip={minaTips[valdMatch.match_id] || null}
          inloggad={inloggad}
          onStäng={() => setValdMatch(null)}
        />
      )}
    </>
  )
}
