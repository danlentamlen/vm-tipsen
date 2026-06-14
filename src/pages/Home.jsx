import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import MatchKort, { normName, getFlag, MATCH_KORT_STYLES, formatTid, dagOffset } from '../components/MatchKort'
import { prognosForSpelare } from '../utils/prediktion'

/**
 * Justerar matchens datum (YYYY-MM-DD) om CEST-konverteringen korsar midnatt.
 * Returnerar det svenska datumet för matchen.
 */
function adjustedDatumHome(match) {
  const offset = dagOffset(match.tid)
  if (offset === 0 || !match.datum) return match.datum || ''
  try {
    const d = new Date(match.datum)
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  } catch { return match.datum }
}

const GRUPPSPEL_DEADLINE = new Date('2026-06-11T19:00:00+02:00')

const LANDING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@400;500&display=swap');

  .home-hero { min-height:calc(100svh - 60px); background:linear-gradient(160deg,#0a1628 0%,#0d2040 50%,#0a1628 100%); display:flex; align-items:center; padding:3rem 1.5rem 4rem; position:relative; overflow:hidden; }
  .home-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 70% 50% at 50% 30%,rgba(200,16,46,0.12) 0%,transparent 60%),radial-gradient(ellipse 50% 60% at 80% 80%,rgba(197,160,40,0.08) 0%,transparent 50%); pointer-events:none; }
  .hero-inner { max-width:680px; margin:0 auto; text-align:center; position:relative; z-index:1; }
  .hero-eyebrow { display:inline-flex; align-items:center; gap:8px; background:rgba(197,160,40,0.12); border:1px solid rgba(197,160,40,0.3); border-radius:100px; padding:6px 16px; font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:#F0D060; margin-bottom:1.5rem; }
  .hero-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(2.8rem,10vw,5.5rem); font-weight:700; line-height:0.95; letter-spacing:0.01em; color:#fff; margin-bottom:0.5rem; }
  .hero-title .accent { color:#C8102E; display:block; }
  .hero-subtitle { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1rem,3vw,1.3rem); font-weight:400; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.45); margin-bottom:2rem; }
  .hero-desc { font-family:'Barlow',sans-serif; font-size:1rem; color:rgba(255,255,255,0.6); line-height:1.7; max-width:480px; margin:0 auto 2.5rem; }
  .hero-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:3.5rem; }
  .btn-primary { display:inline-block; text-decoration:none; padding:14px 32px; border-radius:8px; background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; border:none; cursor:pointer; transition:opacity .2s,transform .2s; }
  .btn-primary:hover { opacity:.88; transform:translateY(-1px); }
  .btn-secondary { display:inline-block; text-decoration:none; padding:14px 28px; border-radius:8px; background:transparent; color:rgba(255,255,255,0.8); font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; border:1px solid rgba(255,255,255,0.25); cursor:pointer; transition:border-color .2s,color .2s; }
  .btn-secondary:hover { border-color:#F0D060; color:#F0D060; }
  .stats-row { display:flex; justify-content:center; border-top:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.08); padding:1.5rem 0; }
  .stat-item { flex:1; max-width:140px; text-align:center; padding:0 1rem; border-right:1px solid rgba(255,255,255,0.08); }
  .stat-item:last-child { border-right:none; }
  .stat-num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:700; color:#F0D060; line-height:1; display:block; }
  .stat-lbl { font-size:0.65rem; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-top:0.25rem; display:block; }
  .rek-info { font-family:'Barlow',sans-serif; font-size:0.82rem; color:rgba(255,255,255,0.6); margin-top:1.25rem; line-height:1.65; text-align:center; max-width:440px; margin-left:auto; margin-right:auto; background:rgba(197,160,40,0.08); border:1px solid rgba(197,160,40,0.2); border-radius:9px; padding:0.75rem 1rem; }
  .rek-info a { color:#F0D060; text-decoration:underline; }
  .countdown-wrap { display:flex; justify-content:center; gap:.75rem; margin:1.5rem auto; }
  .cd-unit { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:.6rem .875rem; min-width:58px; text-align:center; }
  .cd-num { font-family:'Barlow Condensed',sans-serif; font-size:1.8rem; font-weight:700; color:#F0D060; line-height:1; display:block; }
  .cd-lbl { font-size:.58rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.35); display:block; margin-top:2px; }
  .cd-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.35); text-align:center; margin-bottom:.5rem; }
  .fb-link { display:inline-flex; align-items:center; gap:8px; text-decoration:none; background:rgba(24,119,242,.15); border:1px solid rgba(24,119,242,.3); border-radius:100px; padding:6px 16px; font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#6ba3f5; margin-top:1rem; transition:background .2s; }
  .fb-link:hover { background:rgba(24,119,242,.25); }
  .goal-tracker { background:rgba(255,255,255,0.05); border:1px solid rgba(197,160,40,0.2); border-radius:12px; padding:1.25rem 1.5rem; margin:1.5rem auto 0; max-width:500px; text-align:center; }
  .goal-tracker-label { font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:0.5rem; }
  .goal-tracker-num { font-family:'Barlow Condensed',sans-serif; font-size:3rem; font-weight:700; color:#F0D060; line-height:1; display:block; margin-bottom:0.25rem; }
  .goal-tracker-sub { font-family:'Barlow',sans-serif; font-size:0.78rem; color:rgba(255,255,255,0.35); }
  .goal-tracker-sub strong { color:rgba(255,255,255,0.6); }
  .welcome-section { background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 100%); padding:3rem 1.5rem; text-align:center; }
  .welcome-inner { max-width:560px; margin:0 auto; }
  .welcome-name { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,5vw,2.5rem); font-weight:700; color:#F0D060; letter-spacing:0.03em; margin-bottom:0.5rem; }
  .welcome-sub { color:rgba(255,255,255,0.55); font-size:0.95rem; margin-bottom:2rem; }
  .quick-links { display:grid; grid-template-columns:repeat(2,1fr); gap:0.75rem; max-width:400px; margin:0 auto; }
  .quick-link { text-decoration:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:1rem; text-align:center; transition:background .2s,border-color .2s; }
  .quick-link:hover { background:rgba(197,160,40,0.1); border-color:rgba(197,160,40,0.3); }
  .quick-link-icon { font-size:1.5rem; display:block; margin-bottom:0.35rem; }
  .quick-link-label { font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.7); }
  .how-section { background:#f8f7f4; padding:4rem 1.5rem; }
  .how-inner { max-width:760px; margin:0 auto; }
  .section-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; color:#C8102E; margin-bottom:0.5rem; }
  .section-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:0.02em; margin-bottom:2.5rem; }
  .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
  .step-card { background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:12px; padding:1.5rem 1.25rem; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.04); position:relative; }
  .step-num { position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-family:'Barlow Condensed',sans-serif; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; background:#C8102E; color:#fff; border-radius:4px; padding:2px 8px; }
  .step-icon { font-size:2rem; display:block; margin:0.5rem 0 0.75rem; }
  .step-title { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#0a1628; letter-spacing:0.05em; margin-bottom:0.5rem; }
  .step-desc { font-family:'Barlow',sans-serif; font-size:0.85rem; color:#666; line-height:1.6; }
  @media (max-width:480px) { .stat-item { padding:0 0.6rem; } .stat-num { font-size:1.6rem; } .steps-grid { grid-template-columns:1fr; } .quick-links { grid-template-columns:repeat(2,1fr); } }
`

const DASHBOARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&display=swap');

  .dash-wrap { max-width:760px; margin:0 auto; padding:2rem 1rem 5rem; }
  .dash-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .dash-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.5rem; }

  /* ── Post-lock hero (non-logged-in) ── */
  .pl-hero { background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 100%); padding:2.5rem 1.5rem 2.25rem; text-align:center; }
  .pl-hero-eyebrow { display:inline-flex; align-items:center; gap:8px; background:rgba(197,160,40,.12); border:1px solid rgba(197,160,40,.3); border-radius:100px; padding:5px 14px; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:#F0D060; margin-bottom:1rem; }
  .pl-hero-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(2.2rem,8vw,4rem); font-weight:700; color:#fff; line-height:.95; letter-spacing:.01em; margin-bottom:.5rem; }
  .pl-hero-title .accent { color:#C8102E; }
  .pl-hero-sub { font-family:'Barlow',sans-serif; font-size:.9rem; color:rgba(255,255,255,.5); margin-bottom:1.5rem; line-height:1.6; max-width:400px; margin-left:auto; margin-right:auto; }
  .pl-hero-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  .pl-btn-primary { display:inline-block; text-decoration:none; padding:10px 24px; border-radius:7px; background:linear-gradient(135deg,#C8102E,#e01535); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; transition:opacity .2s; }
  .pl-btn-primary:hover { opacity:.85; }
  .pl-btn-secondary { display:inline-block; text-decoration:none; padding:10px 20px; border-radius:7px; background:transparent; color:rgba(255,255,255,.75); font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; border:1px solid rgba(255,255,255,.2); transition:border-color .2s,color .2s; }
  .pl-btn-secondary:hover { border-color:#F0D060; color:#F0D060; }

  /* ── Post-lock hero (logged-in) ── */
  .li-hero { background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 100%); padding:1.75rem 1.5rem; }
  .li-hero-inner { max-width:760px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .li-hero-left { display:flex; flex-direction:column; gap:4px; }
  .li-hero-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.35); }
  .li-hero-name { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:700; color:#fff; line-height:1; letter-spacing:.02em; }
  .li-hero-minsida { display:inline-flex; align-items:center; gap:5px; width:fit-content; margin-top:6px; text-decoration:none; font-family:'Barlow Condensed',sans-serif; font-size:.74rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.18); border-radius:100px; padding:4px 12px; transition:border-color .15s,color .15s; }
  .li-hero-minsida:hover { border-color:rgba(197,160,40,.5); color:#F0D060; }
  .li-hero-right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; }
  .li-hero-rank-pts { font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:600; color:rgba(255,255,255,.4); }

  /* ── My standing: rank / points / gap / predicted finish ── */
  .li-stats { display:flex; align-items:stretch; gap:0; }
  .li-stat { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:0 .95rem; border-right:1px solid rgba(255,255,255,.1); text-align:center; min-width:62px; }
  .li-stat:last-child { border-right:none; padding-right:0; }
  .li-stat:first-child { padding-left:0; }
  .li-stat-num { font-family:'Barlow Condensed',sans-serif; font-size:1.9rem; font-weight:700; color:#fff; line-height:1; display:inline-flex; align-items:baseline; gap:3px; white-space:nowrap; }
  .li-stat-lbl { font-family:'Barlow Condensed',sans-serif; font-size:.58rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.35); }
  .li-stat:first-child .li-stat-num { color:#F0D060; }
  .li-stat-pred { background:rgba(197,160,40,.1); border-radius:9px; border-right:none; margin-left:.25rem; }
  .li-stat-pred .li-stat-num { color:#F0D060; }
  .li-stat-pred .li-stat-lbl { color:rgba(240,208,96,.7); }
  .li-pred-pil { font-size:.7rem; font-weight:700; letter-spacing:0; }
  .li-pred-pil.upp { color:#4ade80; }
  .li-pred-pil.ned { color:#f87171; }
  .li-pred-pil.still { color:rgba(255,255,255,.4); }
  .li-winchance { font-family:'Barlow',sans-serif; font-size:.74rem; font-weight:500; color:rgba(240,208,96,.85); background:rgba(197,160,40,.1); border:1px solid rgba(197,160,40,.25); border-radius:100px; padding:3px 12px; white-space:nowrap; }
  .li-hero-links { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
  .li-hero-link { text-decoration:none; font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:5px 10px; border-radius:6px; border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.6); transition:all .15s; white-space:nowrap; }
  .li-hero-link:hover { border-color:rgba(197,160,40,.45); color:#F0D060; }

  /* ── Facebook link (dashboard) ── */
  .dash-fb-link { display:inline-flex; align-items:center; gap:8px; text-decoration:none; background:rgba(24,119,242,.1); border:1px solid rgba(24,119,242,.25); border-radius:100px; padding:7px 18px; font-family:'Barlow Condensed',sans-serif; font-size:.75rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#6ba3f5; transition:background .2s; }
  .dash-fb-link:hover { background:rgba(24,119,242,.2); }

  /* ── Banner C ── */
  .home-banner { display:flex; border:1px solid rgba(0,0,0,.07); border-radius:12px; overflow:hidden; margin-bottom:1.75rem; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .home-banner-main { flex:1; background:#fff; padding:.9rem 1rem; display:flex; align-items:center; }
  .home-banner-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(72px,1fr)); gap:.6rem; width:100%; }
  .hb-stat { display:flex; flex-direction:column; align-items:center; gap:3px; padding:.6rem .25rem; border-radius:8px; background:rgba(10,22,40,.03); }
  .hb-icon { font-size:1.1rem; line-height:1; }
  .hb-num { font-family:'Barlow Condensed',sans-serif; font-size:1.35rem; font-weight:700; color:#0a1628; line-height:1; }
  .hb-lbl { font-size:.58rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#bbb; text-align:center; }
  .home-banner-pot { background:#0a1628; padding:1.1rem 1.25rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; min-width:120px; }
  .hb-pot-icon { font-size:1.75rem; line-height:1; }
  .hb-pot-num { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:700; color:#F0D060; line-height:1; }
  .hb-pot-lbl { font-size:.58rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.4); text-align:center; }

  /* ── Section headers ── */
  .dash-section { margin-bottom:2rem; }
  .dash-section-header { display:flex; align-items:center; gap:10px; margin-bottom:.875rem; }
  .dash-section-pill { font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; background:#0a1628; color:#F0D060; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .dash-section-pill.gold { background:linear-gradient(135deg,#C5A028,#a8881f); color:#fff; }
  .dash-section-pill.live { background:#C8102E; color:#fff; }
  .dash-section-line { flex:1; height:1px; background:rgba(0,0,0,.07); }
  .dash-see-all { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#C5A028; text-decoration:none; padding:4px 0; white-space:nowrap; }
  .dash-see-all:hover { color:#0a1628; }

  /* ── Yesterday's best ── */
  .igd-card { background:#fff; border:1px solid rgba(197,160,40,.25); border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .igd-header { display:flex; align-items:center; gap:10px; padding:.75rem 1rem; background:rgba(197,160,40,.06); border-bottom:1px solid rgba(197,160,40,.12); }
  .igd-crown { font-size:1.4rem; }
  .igd-header-text { display:flex; flex-direction:column; gap:1px; }
  .igd-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.8rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#8a6800; }
  .igd-sub { font-family:'Barlow',sans-serif; font-size:.7rem; color:#bbb; }
  .igd-row { display:flex; align-items:center; gap:10px; padding:.65rem 1rem; border-bottom:.5px solid rgba(0,0,0,.04); }
  .igd-row:last-child { border-bottom:none; }
  .igd-pos { width:20px; font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; color:#C5A028; text-align:center; flex-shrink:0; }
  .igd-name { flex:1; font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .igd-badges { display:flex; align-items:center; gap:6px; }
  .igd-badge { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:700; padding:2px 7px; border-radius:20px; }
  .igd-badge.exact { background:rgba(40,160,85,.12); color:#1a7a40; }
  .igd-badge.winner { background:rgba(197,160,40,.15); color:#8a6800; }
  .igd-pts { font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; color:#0a1628; white-space:nowrap; }

  /* ── Leaderboard ── */
  .lb-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .lb-row { display:flex; align-items:center; gap:10px; padding:.7rem 1rem; border-bottom:.5px solid rgba(0,0,0,.05); text-decoration:none; color:inherit; transition:background .15s; }
  .lb-row:last-child { border-bottom:none; }
  .lb-row.me { background:rgba(197,160,40,.05); }
  a.lb-row { cursor:pointer; }
  a.lb-row:hover { background:rgba(197,160,40,.08); }
  .lb-chevron { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; color:#ccc; flex-shrink:0; }
  .lb-rank { width:22px; font-family:'Barlow Condensed',sans-serif; font-size:.88rem; font-weight:700; color:#aaa; text-align:center; flex-shrink:0; }
  .lb-rank.top3 { color:#C5A028; }
  .lb-avatar { width:30px; height:30px; border-radius:50%; background:rgba(10,22,40,.08); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; color:#0a1628; flex-shrink:0; }
  .lb-avatar.me { background:rgba(197,160,40,.15); color:#7a5e10; }
  .lb-name { flex:1; font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .lb-pts { font-family:'Barlow Condensed',sans-serif; font-size:.95rem; font-weight:700; color:#0a1628; }
  .lb-pts-lbl { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; color:#aaa; margin-left:2px; }

  /* ── Skytteligan ── */
  .sk-podium { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:.75rem; }
  .sk-leader { background:linear-gradient(160deg,#0a1628 0%,#1a2e4a 100%); border-radius:12px; padding:1.25rem 1rem; display:flex; flex-direction:column; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(10,22,40,.15); }
  .sk-leader-medal { font-size:1.2rem; line-height:1; }
  .sk-leader-flag { font-size:2.2rem; line-height:1; margin:2px 0; }
  .sk-leader-goals { font-family:'Barlow Condensed',sans-serif; font-size:3rem; font-weight:700; color:#F0D060; line-height:1; }
  .sk-leader-goals-lbl { font-family:'Barlow Condensed',sans-serif; font-size:.6rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.35); }
  .sk-leader-name { font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#fff; text-align:center; margin-top:2px; }
  .sk-leader-country { font-family:'Barlow',sans-serif; font-size:.72rem; color:rgba(255,255,255,.45); }
  .sk-sub-col { display:flex; flex-direction:column; gap:.6rem; }
  .sk-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.9rem 1rem; display:flex; flex-direction:column; align-items:center; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,.04); flex:1; }
  .sk-card-medal { font-size:.95rem; line-height:1; }
  .sk-card-flag { font-size:1.5rem; line-height:1; }
  .sk-card-goals { font-family:'Barlow Condensed',sans-serif; font-size:1.75rem; font-weight:700; color:#0a1628; line-height:1; }
  .sk-card-name { font-family:'Barlow',sans-serif; font-size:.78rem; font-weight:500; color:#0a1628; text-align:center; }
  .sk-card-country { font-family:'Barlow',sans-serif; font-size:.68rem; color:#aaa; }
  .sk-rest-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .sk-rest-row { display:flex; align-items:center; gap:10px; padding:.6rem 1rem; border-bottom:.5px solid rgba(0,0,0,.05); }
  .sk-rest-row:last-child { border-bottom:none; }
  .sk-rest-pos { width:22px; font-family:'Barlow Condensed',sans-serif; font-size:.85rem; font-weight:700; color:#aaa; text-align:center; flex-shrink:0; }
  .sk-rest-flag { font-size:1.1rem; line-height:1; flex-shrink:0; }
  .sk-rest-name { flex:1; font-family:'Barlow',sans-serif; font-size:.88rem; font-weight:500; color:#0a1628; }
  .sk-rest-goals { font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; color:#0a1628; white-space:nowrap; }

  .dash-empty { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem 1rem; text-align:center; font-family:'Barlow',sans-serif; font-size:.88rem; color:#aaa; box-shadow:0 1px 3px rgba(0,0,0,.04); }

  @media (max-width:480px) {
    .sk-podium { grid-template-columns:1fr; }
    .home-banner-pot { min-width:100px; }
    .li-hero-inner { gap:.75rem; }
    .li-hero-right { align-items:stretch; width:100%; }
    .li-stats { width:100%; justify-content:space-between; }
    .li-stat { min-width:0; flex:1; padding:0 .35rem; }
    .li-stat-num { font-size:1.55rem; }
    .li-winchance { text-align:center; align-self:center; }
  }

  ${MATCH_KORT_STYLES}
`

// Parse match start time from tid string like "15:00 UTC-4"
function parseMatchTidFrontend(datum, tid) {
  if (!datum || !tid) return null
  try {
    const m = tid.match(/(\d{1,2}):(\d{2})(?:\s*UTC([+-]?\d+(?:\.\d+)?))?/i)
    if (!m) return null
    const h = parseInt(m[1])
    const min = parseInt(m[2])
    const offset = m[3] ? parseFloat(m[3]) : 0
    // Build UTC time: local match time minus offset = UTC
    const d = new Date(`${datum}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`)
    d.setTime(d.getTime() - offset * 3600000)
    return d
  } catch { return null }
}

export default function Home() {
  const { användare } = useAuth()
  const { t }         = useLanguage()
  const [ticker, setTicker]           = useState(null)
  const [målData, setMålData]         = useState(null)
  const gruppspelLåst = new Date() >= GRUPPSPEL_DEADLINE

  // Countdown state
  const [countdown, setCountdown] = useState(null)
  useEffect(() => {
    if (gruppspelLåst) return
    function tick() {
      const diff = GRUPPSPEL_DEADLINE - new Date()
      if (diff <= 0) { setCountdown(null); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown({ d, h, m, s })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Dashboard state (post-lock only)
  const [matcher, setMatcher]         = useState([])
  const [minaTips, setMinaTips]       = useState({})
  const [matchStats, setMatchStats]   = useState({})
  const [odds, setOdds]               = useState({})
  const [topplista, setTopplista]     = useState([])
  const [igårBäst, setIgårBäst]       = useState([])
  const [topScorers, setTopScorers]   = useState([])
  const [liveScores, setLiveScores]   = useState([])
  const liveIntervalRef               = useRef(null)
  const förraLiveRef                  = useRef(null) // senaste uppsättningen pågående matcher

  useEffect(() => {
    Promise.all([
      fetch('/.netlify/functions/participants').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/viner-hamta').then(r => r.json()).catch(() => []),
      fetch('/.netlify/functions/total-mal').then(r => r.json()).catch(() => null),
    ]).then(([deltagare, viner, malData]) => {
      const antalDeltagare = Array.isArray(deltagare) ? deltagare.length : 0
      const betalda  = Array.isArray(viner) ? viner.filter(v => v.betalt === 'betalt') : []
      const pottVärde = betalda.reduce((s, v) => s + (Number(v.vin_pris) || 0), 0)
      setTicker({ antalDeltagare, antalBetalda: betalda.length, pottVärde })
      if (malData) setMålData(malData)
    })

    if (gruppspelLåst) {
      hämtaDashboard()
    }
  }, [användare])

  async function hämtaDashboard() {
    const [matcherRes, statsRes, oddsRes, scoreRes, igårRes, scorersRes] = await Promise.allSettled([
      fetch('/.netlify/functions/matches').then(r => r.json()),
      fetch('/.netlify/functions/match-stats').then(r => r.json()),
      fetch('/.netlify/functions/odds').then(r => r.json()),
      fetch('/.netlify/functions/scores').then(r => r.json()),
      fetch('/.netlify/functions/scores-yesterday').then(r => r.json()),
      fetch('/.netlify/functions/top-scorers').then(r => r.json()),
    ])

    if (matcherRes.status === 'fulfilled') setMatcher(Array.isArray(matcherRes.value) ? matcherRes.value : [])
    if (statsRes.status === 'fulfilled' && !statsRes.value?.error) setMatchStats(statsRes.value || {})
    if (oddsRes.status === 'fulfilled' && oddsRes.value?.odds) {
      const lookup = {}
      oddsRes.value.odds.forEach(o => {
        const key = normName(o.home_team) + '_' + normName(o.away_team)
        lookup[key] = o
      })
      setOdds(lookup)
    }
    if (scoreRes.status === 'fulfilled' && Array.isArray(scoreRes.value)) {
      // Spara HELA topplistan — behövs för verklig placering, gap till toppen
      // och slutplaceringsprognos. Topp 7 plockas ut vid rendering.
      setTopplista(scoreRes.value)
    }
    if (igårRes.status === 'fulfilled' && Array.isArray(igårRes.value)) {
      setIgårBäst(igårRes.value)
    }
    if (scorersRes.status === 'fulfilled' && Array.isArray(scorersRes.value)) {
      setTopScorers(scorersRes.value)
    }

    if (användare) {
      fetch(`/.netlify/functions/tips?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${användare.token}` },
      }).then(r => r.json()).then(data => {
        const map = {}
        data.forEach(tip => { map[tip.match_id] = tip })
        setMinaTips(map)
      }).catch(() => {})
    }
  }

  async function hämtaLiveScores() {
    try {
      const data = await fetch('/.netlify/functions/live-scores').then(r => r.json())
      const lista = Array.isArray(data) ? data : []
      setLiveScores(lista)
      // När uppsättningen pågående matcher ändras (en match startar eller är slut)
      // hämtas dashboarden om direkt — då dyker slutresultat, ny ställning och
      // uppdaterad prognos upp utan att användaren behöver ladda om sidan.
      const nyckel = lista.map(m => `${m.hemmalag}|${m.bortalag}|${m.status}`).sort().join(';')
      if (förraLiveRef.current !== null && nyckel !== förraLiveRef.current) {
        hämtaDashboard()
      }
      förraLiveRef.current = nyckel
    } catch {
      setLiveScores([])
    }
  }

  // Live-uppdatering utan browser-refresh: pollar den pågående matchen var 60:e
  // sekund (mål + minut). När en match startar eller är slut ändras live-setet,
  // och då — och bara då — hämtas dashboarden om så slutresultat/ställning följer
  // med. Samma sak när fliken blir aktiv igen.
  useEffect(() => {
    if (!gruppspelLåst) return
    hämtaLiveScores()
    liveIntervalRef.current = setInterval(hämtaLiveScores, 60 * 1000)

    const vidFokus = () => {
      if (document.visibilityState === 'visible') hämtaLiveScores()
    }
    document.addEventListener('visibilitychange', vidFokus)

    return () => {
      clearInterval(liveIntervalRef.current)
      document.removeEventListener('visibilitychange', vidFokus)
    }
  }, [gruppspelLåst])

  function liveScoreForMatch(match) {
    return liveScores.find(
      (ls) =>
        ls.hemmalag.toLowerCase().trim() === match.hemmalag.toLowerCase().trim() &&
        ls.bortalag.toLowerCase().trim() === match.bortalag.toLowerCase().trim()
    ) || null
  }

  function oddsForMatch(match) {
    const key = normName(match.hemmalag) + '_' + normName(match.bortalag)
    return odds[key] || null
  }

  // ── Landing page (before lock) ──────────────────────────────────────────
  if (!gruppspelLåst) {
    return (
      <>
        <style>{LANDING_STYLES}</style>

        <div className="home-hero">
          <div className="hero-inner">
            <div className="hero-eyebrow"><span>⚽</span>{t('home.eyebrow')}</div>
            <h1 className="hero-title">
              {t('home.titel')}<span className="accent">2026</span>
            </h1>
            <p className="hero-subtitle">{t('home.subtitle')}</p>
            <p className="hero-desc">{t('home.beskrivning')}</p>

            {countdown && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="cd-eyebrow">⏰ Tips stänger om</p>
                <div className="countdown-wrap">
                  <div className="cd-unit"><span className="cd-num">{countdown.d}</span><span className="cd-lbl">dagar</span></div>
                  <div className="cd-unit"><span className="cd-num">{String(countdown.h).padStart(2,'0')}</span><span className="cd-lbl">timmar</span></div>
                  <div className="cd-unit"><span className="cd-num">{String(countdown.m).padStart(2,'0')}</span><span className="cd-lbl">min</span></div>
                  <div className="cd-unit"><span className="cd-num">{String(countdown.s).padStart(2,'0')}</span><span className="cd-lbl">sek</span></div>
                </div>
              </div>
            )}

            {målData?.totalMål > 0 && (
              <div className="goal-tracker">
                <p className="goal-tracker-label">{t('home.målTracker.etikett')}</p>
                <span className="goal-tracker-num">{målData.totalMål}</span>
                <p className="goal-tracker-sub">
                  {t('home.målTracker.på')} {målData.speladeMatcher} {t('home.målTracker.matcher')}
                  {målData.snitMålPerMatch > 0 && (
                    <> · {t('home.målTracker.snitt')} <strong>{målData.snitMålPerMatch}</strong> {t('home.målTracker.målPerMatch')}</>
                  )}
                </p>
              </div>
            )}

            <div className="hero-actions">
              {!användare ? (
                <>
                  <Link to="/register" className="btn-primary">{t('home.anmälDig')}</Link>
                  <Link to="/login" className="btn-secondary">{t('home.loggaIn')}</Link>
                </>
              ) : (
                <>
                  <Link to="/matches" className="btn-primary">{t('home.lämnaKlick')}</Link>
                  <Link to="/leaderboard" className="btn-secondary">{t('home.seTopplistan')}</Link>
                </>
              )}
            </div>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-num">{ticker?.antalBetalda ?? '—'}</span>
                <span className="stat-lbl">{t('home.stats.deltagare')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">{ticker?.pottVärde > 0 ? `${ticker.pottVärde} kr` : '—'}</span>
                <span className="stat-lbl">{t('home.stats.vinvärde')}</span>
              </div>
            </div>

            <p className="rek-info">
              🍷 <strong style={{ color:'#F0D060' }}>{t('home.rekrytering.rubrik')}</strong>{' '}
              {t('home.rekrytering.text')}{' '}
              <Link to="/mitt-vin">{t('home.rekrytering.länkText')}</Link>.
            </p>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <a
                href="https://www.facebook.com/groups/853847373249805/"
                target="_blank"
                rel="noopener noreferrer"
                className="fb-link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                Vår Facebookgrupp
              </a>
            </div>
          </div>
        </div>

        {användare && (
          <div className="welcome-section">
            <div className="welcome-inner">
              <p className="welcome-name">{t('home.välkommen', { namn: användare.namn })}</p>
              <p className="welcome-sub">{t('home.vadVillDu')}</p>
              <div className="quick-links">
                <Link to="/matches" className="quick-link">
                  <span className="quick-link-icon">📅</span>
                  <span className="quick-link-label">{t('home.quickLinks.matcher')}</span>
                </Link>
                <Link to="/leaderboard" className="quick-link">
                  <span className="quick-link-icon">🏆</span>
                  <span className="quick-link-label">{t('home.quickLinks.topplista')}</span>
                </Link>
                <Link to="/questions" className="quick-link">
                  <span className="quick-link-icon">🎯</span>
                  <span className="quick-link-label">{t('home.quickLinks.tilläggsfrågor')}</span>
                </Link>
                <Link to="/mitt-vin" className="quick-link">
                  <span className="quick-link-icon">🍾</span>
                  <span className="quick-link-label">{t('home.quickLinks.minVinflaska')}</span>
                </Link>
                <Link to={`/participant/${användare.user_id}`} className="quick-link">
                  <span className="quick-link-icon">👤</span>
                  <span className="quick-link-label">{t('home.quickLinks.minSida')}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {!användare && (
          <div className="how-section">
            <div className="how-inner">
              <p className="section-eyebrow">{t('home.såFunkar.eyebrow')}</p>
              <h2 className="section-title">{t('home.såFunkar.titel')}</h2>
              <div className="steps-grid">
                {t('home.såFunkar.steg').map((steg, i) => (
                  <div key={i} className="step-card">
                    <span className="step-num">{i + 1}</span>
                    <span className="step-icon">{steg.ikon}</span>
                    <div className="step-title">{steg.titel}</div>
                    <p className="step-desc">{steg.beskr}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Post-lock dashboard ─────────────────────────────────────────────────
  const now  = new Date()
  // Använd CEST (UTC+2) som "dagens datum" för att matcha adjusted datum
  const cestNow    = new Date(now.getTime() + 2 * 3600000)
  const idag       = cestNow.toISOString().slice(0, 10)
  const imorganStr = (() => {
    const d = new Date(cestNow)
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  // Inkludera matcher för:
  //  1. Dagens datum (CEST-justerat)
  //  2. Morgondagens datum (CEST-justerat) om starttid < 08:00 CEST
  const dagensMatcherRaw = matcher.filter(m => {
    const adj = adjustedDatumHome(m)
    if (adj === idag) return true
    if (adj === imorganStr) {
      const cestTid = formatTid(m.tid)
      if (!cestTid || !cestTid.includes(':')) return false
      const h = parseInt(cestTid.split(':')[0])
      return h < 8 // före 08:00 CEST
    }
    return false
  })
  const harResultat = (m) => matchStats[m.match_id] && matchStats[m.match_id].resultat_hemma !== undefined
  const harStartat  = (m) => { const t = parseMatchTidFrontend(m.datum, m.tid); return t ? t <= now : false }

  const speladaIdag = dagensMatcherRaw.filter(m => harResultat(m))
  const ingaResult  = dagensMatcherRaw.filter(m => !harResultat(m))
  const pågående    = ingaResult.filter(m => harStartat(m))
  const kommande    = ingaResult.filter(m => !harStartat(m))

  const minRank = användare && topplista.length > 0
    ? topplista.findIndex(r => r.user_id === användare.user_id)
    : -1
  const minRad     = minRank >= 0 ? topplista[minRank] : null
  const toppPoäng  = topplista[0]?.poäng ?? 0
  const gapTillTopp = minRad ? Math.max(0, toppPoäng - minRad.poäng) : 0

  // Slutplaceringsprognos (Monte Carlo) — körs bara när det finns underlag.
  // useMemo: tung loop, ska inte köras om vid varje render utan bara när
  // topplistan eller antal spelade matcher ändras.
  const minPrognos = useMemo(() => {
    if (!användare || topplista.length === 0) return null
    return prognosForSpelare(topplista, användare.user_id, {
      speladeMatcher: målData?.speladeMatcher || 0,
    })
  }, [topplista, användare, målData?.speladeMatcher])

  // Pil som visar prognostiserad rörelse mot nuvarande placering.
  const prognosPil = (() => {
    if (!minPrognos || minRank < 0) return null
    const nu = minRank + 1
    const spådd = minPrognos.slutplacering
    if (spådd < nu)  return { tecken: '▲', klass: 'upp',  diff: nu - spådd }
    if (spådd > nu)  return { tecken: '▼', klass: 'ned',  diff: spådd - nu }
    return { tecken: '▬', klass: 'still', diff: 0 }
  })()

  function initials(namn) {
    return (namn || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>

      {/* ── Slim hero for non-logged-in visitors ── */}
      {!användare && (
        <div className="pl-hero">
          <div className="pl-hero-eyebrow">⚽ FIFA World Cup 2026</div>
          <h1 className="pl-hero-title">VM-tipsen <span className="accent">2026</span></h1>
          <p className="pl-hero-sub">Turneringen pågår — tipsen är stängda men du kan följa tävlingen och topplistan.</p>
          <div className="pl-hero-actions">
            <Link to="/login" className="pl-btn-primary">Logga in</Link>
          </div>
        </div>
      )}

      {/* ── Personalized hero for logged-in users ── */}
      {användare && (
        <div className="li-hero">
          <div className="li-hero-inner">
            <div className="li-hero-left">
              <span className="li-hero-eyebrow">⚽ FIFA World Cup 2026 pågår</span>
              <h1 className="li-hero-name">Hej, {användare.namn.split(' ')[0]}!</h1>
              <Link to={`/participant/${användare.user_id}`} className="li-hero-minsida">
                👤 {t('home.quickLinks.minSida')} →
              </Link>
            </div>

            {minRank >= 0 ? (
              <div className="li-hero-right">
                <div className="li-stats">
                  <div className="li-stat">
                    <span className="li-stat-num">#{minRank + 1}</span>
                    <span className="li-stat-lbl">Placering</span>
                  </div>
                  <div className="li-stat">
                    <span className="li-stat-num">{minRad?.poäng ?? 0}</span>
                    <span className="li-stat-lbl">Poäng</span>
                  </div>
                  <div className="li-stat">
                    <span className="li-stat-num">
                      {minRank === 0 ? '🏆' : `−${gapTillTopp}`}
                    </span>
                    <span className="li-stat-lbl">
                      {minRank === 0 ? 'I ledning' : 'Till toppen'}
                    </span>
                  </div>
                  {minPrognos && (
                    <div className="li-stat li-stat-pred">
                      <span className="li-stat-num">
                        #{minPrognos.slutplacering}
                        {prognosPil && prognosPil.diff > 0 && (
                          <span className={`li-pred-pil ${prognosPil.klass}`}>
                            {prognosPil.tecken}{prognosPil.diff}
                          </span>
                        )}
                      </span>
                      <span className="li-stat-lbl">Spådd slutplacering</span>
                    </div>
                  )}
                </div>
                {minPrognos && minPrognos.vinstChansProcent >= 1 && (
                  <span className="li-winchance">
                    🔮 {minPrognos.vinstChansProcent}% chans att vinna hela tävlingen
                  </span>
                )}
              </div>
            ) : (
              <div className="li-hero-right">
                <span className="li-hero-rank-pts">Tippa matcher för att komma med på topplistan</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="dash-wrap">

        {/* ── Banner C: stats grid + wine pot ── */}
        <div className="home-banner">
          <div className="home-banner-main">
            <div className="home-banner-grid">
              {målData?.totalMål > 0 && (
                <div className="hb-stat">
                  <span className="hb-icon">⚽</span>
                  <span className="hb-num">{målData.totalMål}</span>
                  <span className="hb-lbl">Mål totalt</span>
                </div>
              )}
              {målData?.speladeMatcher > 0 && (
                <div className="hb-stat">
                  <span className="hb-icon">📅</span>
                  <span className="hb-num">{målData.speladeMatcher}</span>
                  <span className="hb-lbl">Matcher spelat</span>
                </div>
              )}
              {topScorers.length > 0 && (
                <div className="hb-stat">
                  <span className="hb-icon">{getFlag(topScorers[0].land)}</span>
                  <span className="hb-num">{topScorers[0].mål}</span>
                  <span className="hb-lbl">⚽ {topScorers[0].spelare}</span>
                </div>
              )}
              {ticker?.antalBetalda > 0 && (
                <div className="hb-stat">
                  <span className="hb-icon">👥</span>
                  <span className="hb-num">{ticker.antalBetalda}</span>
                  <span className="hb-lbl">Deltagare</span>
                </div>
              )}
            </div>
          </div>
          <div className="home-banner-pot">
            <span className="hb-pot-icon">🍷</span>
            <span className="hb-pot-num">{ticker?.pottVärde > 0 ? `${ticker.pottVärde} kr` : '—'}</span>
            <span className="hb-pot-lbl">Vinstpotten</span>
          </div>
        </div>

        {/* ── Live / ongoing matches ──
            Visas ALLTID överst när en match pågår, ovanför "Bäst igår". */}
        {pågående.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill live">🔴 Pågår nu</span>
              <div className="dash-section-line" />
              <Link to="/matches" className="dash-see-all">Alla matcher →</Link>
            </div>
            {pågående.map(match => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                tipsLåst={true}
                sparar={false}
                onSpara={() => {}}
                odds={oddsForMatch(match)}
                stats={matchStats[match.match_id] || null}
                liveScore={liveScoreForMatch(match)}
              />
            ))}
          </div>
        )}

        {/* ── Yesterday's best (match points 16:00–08:00) ──
            Visas alltid när det finns data; en ev. pågående match ligger ovanför. */}
        {igårBäst.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill gold">🏅 Bäst igår</span>
              <div className="dash-section-line" />
            </div>
            <div className="igd-card">
              <div className="igd-header">
                <span className="igd-crown">🥇</span>
                <div className="igd-header-text">
                  <span className="igd-eyebrow">Topp 3 — bäst igår</span>
                  <span className="igd-sub">Matcher 16:00 igår – 08:00 idag</span>
                </div>
              </div>
              {igårBäst.map((r, i) => (
                <div key={r.user_id} className="igd-row">
                  <span className="igd-pos">{i + 1}</span>
                  <span className="igd-name">{r.namn}</span>
                  <div className="igd-badges">
                    {r.exakta > 0 && <span className="igd-badge exact">⭐ {r.exakta}</span>}
                    {r.rätta > 0  && <span className="igd-badge winner">✓ {r.rätta}</span>}
                    <span className="igd-pts">+{r.poäng} p</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Upcoming matches today ── */}
        {kommande.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">📅 Kommande matcher</span>
              <div className="dash-section-line" />
              <Link to="/matches" className="dash-see-all">Alla matcher →</Link>
            </div>
            {kommande.map(match => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                tipsLåst={true}
                sparar={false}
                onSpara={() => {}}
                odds={oddsForMatch(match)}
                stats={matchStats[match.match_id] || null}
              />
            ))}
          </div>
        )}

        {/* ── Finished matches today ── */}
        {speladaIdag.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">✅ Klara idag</span>
              <div className="dash-section-line" />
            </div>
            {speladaIdag.map(match => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                tipsLåst={true}
                sparar={false}
                onSpara={() => {}}
                odds={oddsForMatch(match)}
                stats={matchStats[match.match_id] || null}
              />
            ))}
          </div>
        )}

        {/* ── No games today ── */}
        {dagensMatcherRaw.length === 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill">📅 Matcher idag</span>
              <div className="dash-section-line" />
              <Link to="/matches" className="dash-see-all">Alla matcher →</Link>
            </div>
            <div className="dash-empty">Inga matcher spelas idag eller tidigt imorgon bitti.</div>
          </div>
        )}

        {/* ── Leaderboard top 7 ── */}
        <div className="dash-section">
          <div className="dash-section-header">
            <span className="dash-section-pill gold">🏆 Topplistan</span>
            <div className="dash-section-line" />
            <Link to="/leaderboard" className="dash-see-all">Se alla →</Link>
          </div>
          {topplista.length === 0 ? (
            <div className="dash-empty">Laddar topplista…</div>
          ) : (
            <div className="lb-card">
              {topplista.slice(0, 7).map((rad, i) => {
                const ärJag = användare && rad.user_id === användare.user_id
                return (
                  <Link
                    key={rad.user_id}
                    to={`/participant/${rad.user_id}`}
                    className={`lb-row${ärJag ? ' me' : ''}`}
                    aria-label={`Visa ${rad.namn}s tips`}
                  >
                    <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
                    <div className={`lb-avatar${ärJag ? ' me' : ''}`}>{initials(rad.namn)}</div>
                    <span className="lb-name">{rad.namn}{ärJag ? ' (du)' : ''}</span>
                    <span className="lb-pts">{rad.poäng}<span className="lb-pts-lbl"> p</span></span>
                    <span className="lb-chevron" aria-hidden="true">›</span>
                  </Link>
                )
              })}
              {användare && minRank >= 7 && (
                <>
                  <div className="lb-row" style={{ justifyContent:'center', padding:'.4rem', color:'#ccc', fontSize:'.75rem' }}>· · ·</div>
                  <Link to={`/participant/${användare.user_id}`} className="lb-row me" aria-label="Visa dina tips">
                    <span className="lb-rank">{minRank + 1}</span>
                    <div className="lb-avatar me">{initials(användare.namn)}</div>
                    <span className="lb-name">{användare.namn} (du)</span>
                    <span className="lb-pts">{topplista[minRank]?.poäng ?? '—'}<span className="lb-pts-lbl"> p</span></span>
                    <span className="lb-chevron" aria-hidden="true">›</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Skytteligan — top 5 goal scorers ── */}
        {topScorers.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <span className="dash-section-pill gold">⚽ Skytteligan</span>
              <div className="dash-section-line" />
            </div>

            {/* Podium: leader (left) + 2nd/3rd (right) */}
            <div className="sk-podium">
              <div className="sk-leader">
                <span className="sk-leader-medal">🥇</span>
                <span className="sk-leader-flag">{getFlag(topScorers[0].land)}</span>
                <span className="sk-leader-goals">{topScorers[0].mål}</span>
                <span className="sk-leader-goals-lbl">mål</span>
                <span className="sk-leader-name">{topScorers[0].spelare}</span>
                <span className="sk-leader-country">{topScorers[0].land}</span>
              </div>

              <div className="sk-sub-col">
                {topScorers[1] && (
                  <div className="sk-card">
                    <span className="sk-card-medal">🥈</span>
                    <span className="sk-card-flag">{getFlag(topScorers[1].land)}</span>
                    <span className="sk-card-goals">{topScorers[1].mål}</span>
                    <span className="sk-card-name">{topScorers[1].spelare}</span>
                    <span className="sk-card-country">{topScorers[1].land}</span>
                  </div>
                )}
                {topScorers[2] && (
                  <div className="sk-card">
                    <span className="sk-card-medal">🥉</span>
                    <span className="sk-card-flag">{getFlag(topScorers[2].land)}</span>
                    <span className="sk-card-goals">{topScorers[2].mål}</span>
                    <span className="sk-card-name">{topScorers[2].spelare}</span>
                    <span className="sk-card-country">{topScorers[2].land}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Compact rows for 4th/5th */}
            {topScorers.slice(3).length > 0 && (
              <div className="sk-rest-card">
                {topScorers.slice(3).map((s, i) => (
                  <div key={s.spelare} className="sk-rest-row">
                    <span className="sk-rest-pos">{i + 4}</span>
                    <span className="sk-rest-flag">{getFlag(s.land)}</span>
                    <span className="sk-rest-name">{s.spelare}</span>
                    <span className="sk-rest-goals">{s.mål} mål</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Facebook group link ── */}
        <div style={{ textAlign:'center', padding:'.5rem 0 1rem' }}>
          <a
            href="https://www.facebook.com/groups/853847373249805/"
            target="_blank"
            rel="noopener noreferrer"
            className="dash-fb-link"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
            Vår Facebookgrupp
          </a>
        </div>

      </div>
    </>
  )
}
