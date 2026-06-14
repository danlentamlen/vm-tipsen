import { useState, useEffect } from 'react'
import DistributionModal from './DistributionModal'

// ── Flaggor ────────────────────────────────────────────────────────────────
export const FLAGS = {
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

export const ODDS_NORM = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  'IR Iran': 'Iran',
  'Czechia': 'Czech Republic',
  'Türkiye': 'Turkey',
  "Côte d'Ivoire": 'Ivory Coast',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'China PR': 'China',
}

export function normName(n) {
  return ((ODDS_NORM[n] || n) ?? '').toLowerCase().trim()
}

export function getFlag(lagnamn) {
  if (!lagnamn) return '🏳'
  if (FLAGS[lagnamn]) return FLAGS[lagnamn]
  const trimmat = lagnamn.trim()
  if (FLAGS[trimmat]) return FLAGS[trimmat]
  const hit = Object.keys(FLAGS).find(k => k.toLowerCase() === trimmat.toLowerCase())
  return hit ? FLAGS[hit] : '🏳'
}

export function formatTid(tid) {
  if (!tid) return ''
  // Parse "HH:MM UTC±N" and convert to Swedish time (CEST = UTC+2)
  const m = tid.match(/(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i)
  if (!m) return tid.replace(/\s*UTC[+-]?\d*/i, '').trim()
  const utcMin = parseInt(m[1]) * 60 + parseInt(m[2]) - parseFloat(m[3]) * 60
  const sweMin = ((utcMin + 120) % 1440 + 1440) % 1440 // +2h, wrap at midnight
  return `${String(Math.floor(sweMin / 60)).padStart(2, '0')}:${String(sweMin % 60).padStart(2, '0')}`
}

/**
 * Tolkar matchens datum ("YYYY-MM-DD") + tid ("HH:MM UTC±N") till en absolut
 * UTC-tidsstämpel i millisekunder. Returnerar null om något saknas/inte går att tolka.
 *
 * Lokal avsparkstid HH:MM gäller i tidszonen UTC±N, så sann UTC = lokal − offset.
 * Används för att sortera matcher kronologiskt oberoende av tidszon (matcherna i
 * VM 2026 spelas över flera amerikanska zoner, UTC-4 till UTC-7).
 */
export function matchStartMs(datum, tid) {
  if (!datum || !tid) return null
  const dm = String(datum).match(/(\d{4})-(\d{2})-(\d{2})/)
  const tm = String(tid).match(/(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i)
  if (!dm || !tm) return null
  const [, y, mo, d] = dm
  const tim = parseInt(tm[1], 10)
  const min = parseInt(tm[2], 10)
  const offset = parseFloat(tm[3]) // timmar
  const localMs = Date.UTC(+y, +mo - 1, +d, tim, min)
  return localMs - offset * 3600 * 1000
}

/**
 * Returnerar dagförskjutningen (+1 eller 0) som uppstår när matchens tid
 * konverteras till svensk tid (CEST = UTC+2). Används för att justera datumet
 * när matchen korsar midnatt vid omvandling.
 */
export function dagOffset(tid) {
  if (!tid) return 0
  const m = tid.match(/(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i)
  if (!m) return 0
  const utcMin = parseInt(m[1]) * 60 + parseInt(m[2]) - parseFloat(m[3]) * 60
  const sweMinRaw = utcMin + 120 // CEST = UTC+2, utan modulo
  return sweMinRaw >= 1440 ? 1 : sweMinRaw < 0 ? -1 : 0
}

/**
 * Beräknad matchminut från avsparkstid, för när ingen källa ger den exakt.
 * Ren klockmatematik (nu − avspark) → ingen extra pollning eller externt API.
 *
 * Modell (ungefärlig, justerbar via konstanterna nedan):
 *   1:a halvlek : visad minut 1–45, spelas på ca 45–49 verkliga min (stopptid)
 *   Paus        : PAUS_LÄNGD verkliga minuter (efter PAUS_START)
 *   2:a halvlek : visad minut 46–90 därefter
 * Returnerar ett tal (minut), strängen 'Paus', eller null (ej igång).
 *
 * OBS: en uppskattning — vi känner inte den faktiska stopptiden, så siffran kan
 * skilja någon minut mot tv. Den används bara som fallback när källan saknar minut.
 */
const PAUS_START = 49                          // visa Paus efter så här många verkliga min
const PAUS_LÄNGD = 15                          // verkliga minuter i pausen
const ANDRA_START = PAUS_START + PAUS_LÄNGD    // 2:a halvlek börjar (verklig min)

export function beräknadMatchminut(datum, tid, nu = Date.now()) {
  const start = matchStartMs(datum, tid)
  if (start == null) return null
  const R = Math.floor((nu - start) / 60000)   // verkliga minuter sedan avspark
  if (R < 0) return null                        // ej startad
  if (R < 1) return 1                           // precis avspark
  if (R <= 45) return R                          // 1:a halvlek
  if (R <= PAUS_START) return 45                 // stopptid 1:a halvlek → visa 45
  if (R < ANDRA_START) return 'Paus'
  const andra = 46 + (R - ANDRA_START)           // 2:a halvlek börjar på 46
  return andra > 90 ? 90 : andra                 // håll på 90 vid övertid (okänd stopptid)
}

export function beräknaPoäng(tip, stats) {
  if (!stats || stats.resultat_hemma === undefined) return null
  if (Number(tip.hemma_mål) === stats.resultat_hemma && Number(tip.borta_mål) === stats.resultat_borta) return 5
  const tipOutcome = Number(tip.hemma_mål) > Number(tip.borta_mål) ? 'H' : Number(tip.hemma_mål) === Number(tip.borta_mål) ? 'X' : 'B'
  const resOutcome = stats.resultat_hemma > stats.resultat_borta ? 'H' : stats.resultat_hemma === stats.resultat_borta ? 'X' : 'B'
  return tipOutcome === resOutcome ? 2 : 0
}

/**
 * Bygger en extern länk till FIFA:s officiella match-center för matchens dag.
 *
 * FIFA:s exakta matchsida kräver interna ID:n (idCompetition/idSeason/idStage/
 * idMatch, t.ex. .../match/17/285023/289273/400021458) som vår matchdata inte
 * bär — match_id är bara ett löpnummer. Däremot använder FIFA:s match-center en
 * global ?date=YYYY-MM-DD-parameter (syns även i deras egna matchadresser). Vi
 * länkar därför till match-centret scopat till matchens dag: en riktig FIFA-sida,
 * rätt datum, ett klick från matchen — och aldrig en död länk (inget gissat ID).
 *
 * match.datum är venue-lokalt (YYYY-MM-DD från openfootball), samma datum FIFA
 * listar matchen under, så vi skickar det rått utan tidszonsjustering.
 */
export function fifaMatchUrl(match) {
  const datum = String(match?.datum || '').match(/\d{4}-\d{2}-\d{2}/)?.[0]
  const bas = 'https://www.fifa.com/en/match-centre'
  return datum ? `${bas}?date=${datum}` : bas
}

export const MATCH_KORT_STYLES = `
  .mc { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; margin-bottom:.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); transition:box-shadow .15s; }
  .mc.has-tip { border-left:3px solid #C5A028; }
  .mc.exact   { border-left:3px solid #28a055; }
  .mc.winner  { border-left:3px solid #C5A028; }
  .mc.wrong   { border-left:3px solid #C8102E; }
  .mc-body { display:flex; align-items:center; padding:.75rem 1rem; gap:8px; }
  .mc-teams { display:flex; align-items:center; flex:1; gap:8px; min-width:0; }
  .mc-team-home, .mc-team-away { display:flex; align-items:center; gap:6px; flex:1; min-width:0; }
  .mc-team-home { justify-content:flex-end; }
  .mc-team-away { justify-content:flex-start; }
  .mc-team-name { font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px; }
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
  .mc-result-inline { display:flex; align-items:center; gap:4px; }
  .mc-rbox { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:800; color:#fff; background:#0a1628; border-radius:7px; padding:4px 10px; min-width:30px; text-align:center; }
  .mc-rsep { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#ccc; }
  .mc-tip-strip { display:flex; align-items:center; gap:8px; padding:.45rem 1rem .55rem; border-top:1px solid rgba(0,0,0,.05); flex-wrap:wrap; }
  .mc-tip-score { display:flex; align-items:center; gap:4px; }
  .mc-tip-box { font-family:'Barlow Condensed',sans-serif; font-size:.95rem; font-weight:700; border-radius:5px; padding:2px 7px; min-width:24px; text-align:center; }
  .mc-tip-box.exact  { background:rgba(40,160,85,.15); color:#1a7a40; border:1px solid rgba(40,160,85,.3); }
  .mc-tip-box.winner { background:rgba(197,160,40,.15); color:#8a6800; border:1px solid rgba(197,160,40,.3); }
  .mc-tip-box.wrong  { background:rgba(200,16,46,.08); color:#a01020; border:1px solid rgba(200,16,46,.2); }
  .mc-tip-box.notip  { background:rgba(0,0,0,.04); color:#aaa; border:1px solid rgba(0,0,0,.08); }
  .mc-pts-badge { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:800; letter-spacing:.08em; padding:2px 8px; border-radius:20px; white-space:nowrap; }
  .mc-pts-badge.exact  { background:rgba(40,160,85,.15); color:#1a7a40; }
  .mc-pts-badge.winner { background:rgba(197,160,40,.18); color:#8a6800; }
  .mc-pts-badge.wrong  { background:rgba(0,0,0,.06); color:#999; }
  .mc-stat-row { display:flex; align-items:center; gap:5px; padding:.35rem 1rem .5rem; border-top:1px solid rgba(0,0,0,.04); flex-wrap:wrap; }
  .mc-stat-chip { font-family:'Barlow Condensed',sans-serif; font-size:.67rem; font-weight:600; letter-spacing:.06em; padding:2px 8px; border-radius:20px; white-space:nowrap; }
  .mc-stat-chip.exact  { background:rgba(40,160,85,.1); color:#1a7a40; }
  .mc-stat-chip.winner { background:rgba(197,160,40,.12); color:#8a6800; }
  .mc-stat-chip.wrong  { background:rgba(200,16,46,.07); color:#b01030; }
  .mc-stat-totalt { font-family:'Barlow',sans-serif; font-size:.65rem; color:#bbb; margin-left:auto; white-space:nowrap; }
  .mc-odds-wrap { padding:.3rem 1rem .4rem; border-top:1px solid rgba(0,0,0,.04); }
  .mc-odds-header { display:flex; align-items:center; gap:5px; margin-bottom:4px; }
  .mc-odds-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#bbb; }
  .mc-odds-bar { display:flex; height:5px; border-radius:4px; overflow:hidden; margin-bottom:4px; gap:2px; }
  .mc-odds-bar-home { background:#0a1628; border-radius:3px 0 0 3px; transition:width .4s; }
  .mc-odds-bar-draw { background:#d0ccc4; }
  .mc-odds-bar-away { background:#C8102E; border-radius:0 3px 3px 0; transition:width .4s; }
  .mc-odds-labels { display:flex; align-items:center; justify-content:space-between; }
  .mc-odds-side { display:flex; flex-direction:column; gap:1px; }
  .mc-odds-side.home { align-items:flex-start; }
  .mc-odds-side.away { align-items:flex-end; }
  .mc-odds-team { display:flex; align-items:center; gap:3px; font-family:'Barlow',sans-serif; font-size:.68rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; }
  .mc-odds-team .flag { font-size:.75rem; flex-shrink:0; }
  .mc-odds-pct { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:800; color:#0a1628; }
  .mc-odds-draw-col { display:flex; flex-direction:column; align-items:center; gap:1px; }
  .mc-odds-draw-label { font-family:'Barlow',sans-serif; font-size:.65rem; color:#aaa; }
  .mc-odds-draw-pct { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:700; color:#888; }
  .mc-result-label { font-family:'Barlow Condensed',sans-serif; font-size:.6rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#aaa; }
  /* Live-kort: livfull behandling — pulserande glöd + animerad accent. */
  .mc.live { position:relative; border:1px solid rgba(200,16,46,.35); border-left:3px solid #C8102E; animation:mc-live-glow 2.4s ease-in-out infinite; }
  @keyframes mc-live-glow { 0%,100%{box-shadow:0 2px 10px rgba(200,16,46,.12)} 50%{box-shadow:0 4px 22px rgba(200,16,46,.30)} }
  .mc-live-accent { height:3px; background:linear-gradient(90deg,#C8102E,#e63950,#C8102E); background-size:200% 100%; animation:mc-live-shimmer 2s linear infinite; }
  @keyframes mc-live-shimmer { 0%{background-position:0% 0} 100%{background-position:200% 0} }
  .mc-live-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; }
  .mc-live-score { display:flex; align-items:center; gap:5px; }
  .mc-live-box { font-family:'Barlow Condensed',sans-serif; font-size:1.45rem; font-weight:800; color:#fff; background:linear-gradient(135deg,#C8102E,#e63950); border-radius:7px; padding:4px 12px; min-width:32px; text-align:center; box-shadow:0 2px 6px rgba(200,16,46,.35); }
  .mc-live-sep { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#ccc; }
  .mc-live-badge { display:inline-flex; align-items:center; gap:5px; font-family:'Barlow Condensed',sans-serif; font-size:.66rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#fff; background:#C8102E; padding:3px 9px; border-radius:20px; box-shadow:0 1px 4px rgba(200,16,46,.4); }
  .mc-live-min { font-weight:700; opacity:.92; }
  .mc-live-dot { width:7px; height:7px; border-radius:50%; background:#fff; animation:mc-pulse 1.2s ease-in-out infinite; flex-shrink:0; }
  @keyframes mc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
  @media (prefers-reduced-motion: reduce) {
    .mc.live { animation:none; box-shadow:0 2px 12px rgba(200,16,46,.20); }
    .mc-live-accent { animation:none; }
    .mc-live-dot { animation:none; }
  }
  .mc-combo-wrap { display:flex; flex-direction:column; gap:6px; padding:.45rem 1rem .55rem; border-top:1px solid rgba(0,0,0,.04); }
  .mc-combo-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#bbb; }
  .mc-combo-grid { display:grid; grid-template-columns:68px 1fr; gap:12px; align-items:center; }
  .mc-donut-col { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .mc-donut-legend { display:flex; gap:4px; flex-wrap:wrap; justify-content:center; }
  .mc-donut-leg { font-family:'Barlow Condensed',sans-serif; font-size:.6rem; font-weight:700; }
  .mc-donut-leg.h { color:#0a1628; }
  .mc-donut-leg.x { color:#9a9690; }
  .mc-donut-leg.b { color:#C8102E; }
  .mc-sc-list { display:flex; flex-direction:column; gap:5px; }
  .mc-sc-row { display:flex; align-items:center; gap:7px; }
  .mc-sc-score { font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:800; color:#0a1628; min-width:30px; }
  .mc-sc-bar-wrap { flex:1; height:4px; background:rgba(0,0,0,.07); border-radius:2px; overflow:hidden; }
  .mc-sc-bar-fill { height:100%; background:#0a1628; border-radius:2px; opacity:.5; transition:width .3s; }
  .mc-sc-cnt { font-family:'Barlow',sans-serif; font-size:.62rem; color:#aaa; text-align:right; min-width:38px; white-space:nowrap; }
  .mc-footer { display:flex; align-items:center; gap:6px; padding:.4rem 1rem .5rem; border-top:1px solid rgba(0,0,0,.05); font-family:'Barlow',sans-serif; font-size:.75rem; color:#bbb; }
  .mc-footer-dot { width:3px; height:3px; border-radius:50%; background:#ddd; }
  .mc-detail-link { margin-left:auto; display:inline-flex; align-items:center; gap:3px; font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#C5A028; text-decoration:none; white-space:nowrap; }
  .mc-detail-link:hover { color:#8a6800; text-decoration:underline; }
  .mc-vilka-row { display:flex; padding:0 1rem .55rem; }
  .mc-vilka-btn { display:inline-flex; align-items:center; gap:5px; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#0a1628; background:#f0ede6; border:none; border-radius:20px; padding:4px 12px; cursor:pointer; transition:background .15s; }
  .mc-vilka-btn:hover { background:#e8e4dc; }
  .mc-vilka-btn.live { background:rgba(200,16,46,.08); color:#a01020; }
  .mc-vilka-btn.live:hover { background:rgba(200,16,46,.14); }
`

export default function MatchKort({ match, tip, inloggad, tipsLåst, sparar, onSpara, odds, stats, liveScore, t }) {
  const [hemma, setHemma] = useState(tip?.hemma_mål ?? '')
  const [borta, setBorta] = useState(tip?.borta_mål ?? '')
  const [visaVilka, setVisaVilka] = useState(false)

  useEffect(() => {
    setHemma(tip?.hemma_mål ?? '')
    setBorta(tip?.borta_mål ?? '')
  }, [tip])

  const harTips     = tip !== undefined
  const harResultat = stats && stats.resultat_hemma !== undefined
  const ärLive      = !!liveScore
  const tid         = formatTid(match.tid)

  // Lokal klocka som tickar var 30:e sekund medan matchen är live, så den
  // beräknade minuten räknar upp av sig själv utan extra nätverksanrop.
  const [nu, setNu] = useState(() => Date.now())
  useEffect(() => {
    if (!ärLive) return
    const id = setInterval(() => setNu(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [ärLive])

  // Källans minut har företräde; saknas den faller vi tillbaka på beräkningen.
  const apiMinut   = liveScore?.minut ?? null
  const beräknad   = ärLive && apiMinut == null ? beräknadMatchminut(match.datum, match.tid, nu) : null
  const visaPaus   = liveScore?.status === 'PAUSED' || beräknad === 'Paus'
  const visaMinut  = apiMinut ?? (typeof beräknad === 'number' ? beräknad : null)

  // Under live finns inget slutresultat i `stats` — räkna preliminär poäng från
  // den pågående ställningen så kortet visar hur många poäng tipset ger just nu.
  const liveStats = ärLive && liveScore?.hemma != null && liveScore?.borta != null
    ? { resultat_hemma: Number(liveScore.hemma), resultat_borta: Number(liveScore.borta) }
    : null
  const poäng = harTips
    ? (harResultat ? beräknaPoäng(tip, stats) : liveStats ? beräknaPoäng(tip, liveStats) : null)
    : null
  const outcomeClass = poäng === 5 ? 'exact' : poäng === 2 ? 'winner' : poäng === 0 ? 'wrong' : ''

  // Resultatet att markera i "vilka tippade"-modalen: live-ställning har företräde,
  // annars slutresultatet. Strängformat "h-b" matchar nyckeln i fördelningen.
  const aktuelltResultat = ärLive
    ? (liveScore?.hemma != null && liveScore?.borta != null ? `${liveScore.hemma}-${liveScore.borta}` : null)
    : harResultat ? `${stats.resultat_hemma}-${stats.resultat_borta}` : null
  const visaVilkaKnapp = tipsLåst && (harResultat || ärLive)

  const cardClass = [
    'mc',
    ärLive ? 'live' : harResultat && harTips ? outcomeClass : harTips ? 'has-tip' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      {ärLive && <div className="mc-live-accent" />}
      <div className="mc-body">
        <div className="mc-teams">
          <div className="mc-team-home">
            <span className="mc-team-name">{match.hemmalag}</span>
            <div className="mc-flag-wrap">{getFlag(match.hemmalag)}</div>
          </div>

          <div className="mc-centre">
            {ärLive ? (
              <div className="mc-live-wrap">
                <div className="mc-live-score">
                  <span className="mc-live-box">{liveScore.hemma ?? '–'}</span>
                  <span className="mc-live-sep">–</span>
                  <span className="mc-live-box">{liveScore.borta ?? '–'}</span>
                </div>
                <span className="mc-live-badge">
                  <span className="mc-live-dot" />
                  LIVE
                  {visaPaus
                    ? <span className="mc-live-min">PAUS</span>
                    : visaMinut ? <span className="mc-live-min">{visaMinut}'</span> : null}
                </span>
              </div>
            ) : inloggad && !tipsLåst ? (
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
                  {sparar ? (t?.('matches.sparar') || 'Sparar…') : harTips ? (t?.('matches.uppdatera') || 'Uppdatera') : (t?.('matches.spara') || 'Spara')}
                </button>
              </>
            ) : tipsLåst && !harResultat && harTips ? (
              <div className="mc-score-locked">
                <span className="mc-score-box">{hemma}</span>
                <span className="mc-sep">–</span>
                <span className="mc-score-box">{borta}</span>
              </div>
            ) : tipsLåst && harResultat ? (
              <div className="mc-result-inline">
                <span className="mc-rbox">{stats.resultat_hemma}</span>
                <span className="mc-rsep">–</span>
                <span className="mc-rbox">{stats.resultat_borta}</span>
              </div>
            ) : (
              <span className="mc-vs">{t?.('matches.vs') || 'vs'}</span>
            )}
          </div>

          <div className="mc-team-away">
            <div className="mc-flag-wrap">{getFlag(match.bortalag)}</div>
            <span className="mc-team-name">{match.bortalag}</span>
          </div>
        </div>
      </div>

      {/* Played/live match: compact tip strip */}
      {tipsLåst && (harResultat || ärLive) && inloggad && (
        <div className="mc-tip-strip">
          <span className="mc-result-label">{t?.('matches.dittTips') || 'Ditt tips'}</span>
          {harTips ? (
            <>
              <div className="mc-tip-score">
                <span className={`mc-tip-box ${outcomeClass}`}>{tip.hemma_mål}</span>
                <span className="mc-sep" style={{ fontSize: '.75rem', color: '#bbb' }}>–</span>
                <span className={`mc-tip-box ${outcomeClass}`}>{tip.borta_mål}</span>
              </div>
              <span className={`mc-pts-badge ${outcomeClass}`}>
                {(poäng === 5 ? '+5 p ⭐' : poäng === 2 ? '+2 p' : '0 p') + (ärLive ? ' nu' : '')}
              </span>
            </>
          ) : (
            <span className="mc-tip-box notip">–</span>
          )}
        </div>
      )}

      {/* "Vilka tippade?" — öppnar modal med namn per resultat, rätt rad markerad */}
      {visaVilkaKnapp && (
        <div className="mc-vilka-row">
          <button
            className={`mc-vilka-btn${ärLive ? ' live' : ''}`}
            onClick={(e) => { e.stopPropagation(); setVisaVilka(true) }}
          >
            👥 {aktuelltResultat
              ? `${t?.('matches.vilkaTippade') || 'Vilka tippade'} ${aktuelltResultat}?`
              : (t?.('matches.vilkaTippade') || 'Vilka tippade') + '?'}
          </button>
        </div>
      )}

      {visaVilka && (
        <DistributionModal
          typ="match"
          id={match.match_id}
          titel={`${match.hemmalag} – ${match.bortalag}`}
          markeraResultat={aktuelltResultat}
          onStäng={() => setVisaVilka(false)}
        />
      )}

      {/* Played match: group accuracy stats */}
      {tipsLåst && harResultat && !ärLive && stats.totalt > 0 && (
        <div className="mc-stat-row">
          <span className="mc-stat-chip exact">⚽ {Math.round((stats.exakt / stats.totalt) * 100)}% {t?.('matches.exakt') || 'exakt'}</span>
          <span className="mc-stat-chip winner">✓ {Math.round((stats.rätt_vinnare / stats.totalt) * 100)}% {t?.('matches.rättVinnare') || 'rätt vinnare'}</span>
          <span className="mc-stat-chip wrong">✗ {Math.round((stats.fel / stats.totalt) * 100)}% {t?.('matches.fel') || 'fel'}</span>
          <span className="mc-stat-totalt">{stats.totalt} {t?.('matches.tips') || 'tips'}</span>
        </div>
      )}

      {/* Odds bar (upcoming matches) */}
      {odds && !harResultat && (
        <div className="mc-odds-wrap">
          <div className="mc-odds-header">
            <span className="mc-odds-eyebrow">📊 {t?.('matches.odds') || 'Spelbolagens odds'}</span>
          </div>
          <div className="mc-odds-bar">
            <div className="mc-odds-bar-home" style={{ width: `${odds.home_prob}%` }} />
            <div className="mc-odds-bar-draw" style={{ width: `${odds.draw_prob}%` }} />
            <div className="mc-odds-bar-away" style={{ width: `${odds.away_prob}%` }} />
          </div>
          <div className="mc-odds-labels">
            <div className="mc-odds-side home">
              <span className="mc-odds-pct">{odds.home_prob}%</span>
              <span className="mc-odds-team"><span className="flag">{getFlag(match.hemmalag)}</span>{match.hemmalag}</span>
            </div>
            <div className="mc-odds-draw-col">
              <span className="mc-odds-draw-pct">{odds.draw_prob}%</span>
              <span className="mc-odds-draw-label">{t?.('matches.oavgjort') || 'Oavgjort'}</span>
            </div>
            <div className="mc-odds-side away">
              <span className="mc-odds-pct">{odds.away_prob}%</span>
              <span className="mc-odds-team">{match.bortalag}<span className="flag">{getFlag(match.bortalag)}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming: donut + top 3 scores (two-column) */}
      {tipsLåst && !harResultat && stats && stats.totalt > 0 && (() => {
        const r = 17
        const circ = 2 * Math.PI * r
        const homeLen = (stats.hemma_pct / 100) * circ
        const drawLen = (stats.draw_pct / 100) * circ
        const awayLen = (stats.borta_pct / 100) * circ
        const top3 = stats.populäraste?.slice(0, 3) || []
        const maxCount = top3[0]?.count || 1
        return (
          <div className="mc-combo-wrap">
            <div className="mc-combo-eyebrow">Gruppens tips</div>
            <div className="mc-combo-grid">
            <div className="mc-donut-col">
              <svg viewBox="0 0 50 50" width="62" height="62">
                <circle cx="25" cy="25" r={r} fill="none" stroke="#f0ede6" strokeWidth="7" />
                {stats.hemma_pct > 0 && (
                  <circle cx="25" cy="25" r={r} fill="none" stroke="#0a1628" strokeWidth="7"
                    strokeDasharray={`${homeLen} ${circ}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 25 25)" />
                )}
                {stats.draw_pct > 0 && (
                  <circle cx="25" cy="25" r={r} fill="none" stroke="#9a9690" strokeWidth="7"
                    strokeDasharray={`${drawLen} ${circ}`}
                    strokeDashoffset={`${-homeLen}`}
                    transform="rotate(-90 25 25)" />
                )}
                {stats.borta_pct > 0 && (
                  <circle cx="25" cy="25" r={r} fill="none" stroke="#C8102E" strokeWidth="7"
                    strokeDasharray={`${awayLen} ${circ}`}
                    strokeDashoffset={`${-(homeLen + drawLen)}`}
                    transform="rotate(-90 25 25)" />
                )}
                <text x="25" y="23" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontSize="8.5" fontWeight="700" fill="#0a1628">{stats.totalt}</text>
                <text x="25" y="31" textAnchor="middle" fontFamily="Barlow, sans-serif" fontSize="5.5" fill="#aaa">tips</text>
              </svg>
              <div className="mc-donut-legend">
                <span className="mc-donut-leg h">H {stats.hemma_pct}%</span>
                <span className="mc-donut-leg x">X {stats.draw_pct}%</span>
                <span className="mc-donut-leg b">B {stats.borta_pct}%</span>
              </div>
            </div>
            {top3.length > 0 && (
              <div className="mc-sc-list">
                {top3.map((s) => (
                  <div key={`${s.hemma}-${s.borta}`} className="mc-sc-row">
                    <span className="mc-sc-score">{s.hemma}–{s.borta}</span>
                    <div className="mc-sc-bar-wrap">
                      <div className="mc-sc-bar-fill" style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="mc-sc-cnt">{s.count} tips</span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )
      })()}

      {(tid || match.arena || (harResultat && !ärLive)) && (
        <div className="mc-footer">
          {tid && <span>{tid}</span>}
          {tid && match.arena && <span className="mc-footer-dot" />}
          {match.arena && <span>{match.arena}</span>}
          {harResultat && !ärLive && (
            <a
              className="mc-detail-link"
              href={fifaMatchUrl(match)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {t?.('matches.matchfakta') || 'Matchfakta'} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
