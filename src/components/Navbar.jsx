/**
 * Navbar.jsx — Fix: infinite render loop
 *
 * Problem:
 *   allaLänkar = [ ... ] skapades inline i komponenten → ny array-referens
 *   varje render → useCallback(räknaPlats, [allaLänkar]) bytte referens →
 *   ResizeObserver disconnect/observe → setState → render → loop.
 *
 * Fix:
 *   1. useMemo på allaLänkar — stabil referens så länge t() och användare
 *      inte ändras (vilket de inte gör vid varje render)
 *   2. useCallback på räknaPlats med [allaLänkar] som dep — triggas bara
 *      när listan faktiskt förändras (språkbyte eller login/logout)
 *   3. ResizeObserver-effekten beror bara på räknaPlats
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useMyStatus } from '../hooks/useMyStatus'

const OLÄST_KEY   = 'forum_senast_läst'
const MER_BREDD   = 44
const HÖGER_BREDD = 190

function hämtaOlästa() {
  try {
    const senastLäst = localStorage.getItem(OLÄST_KEY)
    const cachadData = localStorage.getItem('forum_inlägg_cache')
    if (!cachadData) return 0
    const inlägg = JSON.parse(cachadData)
    if (!senastLäst) return inlägg.length
    const gräns = new Date(senastLäst)
    return inlägg.filter((p) => new Date(p.created_at) > gräns).length
  } catch { return 0 }
}

function initialer(namn = '') {
  return namn.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('')
}
function förnamn(namn = '') {
  return namn.trim().split(/\s+/)[0] || namn
}

export default function Navbar() {
  const { användare, logga_ut } = useAuth()
  const { t }                   = useLanguage()

  const [synliga, setSynliga]             = useState([])
  const [overflow, setOverflow]           = useState([])
  const [menuOpen, setMenuOpen]           = useState(false)
  const [avatarOpen, setAvatarOpen]       = useState(false)
  const [merOpen, setMerOpen]             = useState(false)
  const [olästa, setOlästa]               = useState(0)
  const [adminModal, setAdminModal]       = useState(false)
  const [adminLösenord, setAdminLösenord] = useState('')
  const [adminFel, setAdminFel]           = useState(null)
  const [adminLaddar, setAdminLaddar]     = useState(false)

  const myStatus = useMyStatus(användare)

  const location      = useLocation()
  const navigate      = useNavigate()
  const tapCount      = useRef(0)
  const tapTimer      = useRef(null)
  const adminInputRef = useRef(null)
  const avatarRef     = useRef(null)
  const merRef        = useRef(null)
  const innerRef      = useRef(null)
  const mätRef        = useRef(null)

  // ── FIX: useMemo → stabil referens, skapas bara om på t() eller inloggning ──
  const allaLänkar = useMemo(() => [
    { to: '/matches',      label: t('navbar.links.matches'),      icon: '📅', inloggadKrävs: false },
    { to: '/slutspel',     label: 'Slutspel',                     icon: '🏆', inloggadKrävs: false },
    { to: '/questions',    label: t('navbar.links.questions'),    icon: '🎯', inloggadKrävs: false },
    { to: '/skytteliga',   label: t('navbar.links.skytteliga'),   icon: '👟', inloggadKrävs: false },
    { to: '/leaderboard',  label: t('navbar.links.leaderboard'),  icon: '🏆', inloggadKrävs: false },
    { to: '/oversikt',     label: t('navbar.links.oversikt'),     icon: '📊', inloggadKrävs: false },
    { to: '/vinpotten',    label: t('navbar.links.vinpotten'),    icon: '🍷', inloggadKrävs: false },
    { to: '/participants', label: t('navbar.links.participants'), icon: '👥', inloggadKrävs: true  },
    { to: '/forum',        label: t('navbar.links.forum'),        icon: '💬', inloggadKrävs: true  },
    { to: '/info',         label: t('navbar.links.info'),         icon: '📋', inloggadKrävs: false },
  ].filter(({ inloggadKrävs }) => !inloggadKrävs || !!användare), [t, användare])

  const isActive = (path) => location.pathname === path

  // ── räknaPlats beror nu på stabil allaLänkar-referens ──
  const räknaPlats = useCallback(() => {
    if (!innerRef.current || !mätRef.current) return
    const tillgänglig = innerRef.current.offsetWidth - HÖGER_BREDD - 8
    const länkElem = Array.from(mätRef.current.children)
    let ackumulerad = 0
    let sista = 0
    for (let i = 0; i < länkElem.length; i++) {
      const bredd = länkElem[i].offsetWidth + 4
      const reserveraMer = i < länkElem.length - 1
      const gräns = reserveraMer ? tillgänglig - MER_BREDD : tillgänglig
      if (ackumulerad + bredd > gräns) break
      ackumulerad += bredd
      sista = i + 1
    }
    setSynliga(allaLänkar.slice(0, sista))
    setOverflow(allaLänkar.slice(sista))
  }, [allaLänkar])

  // ── ResizeObserver — triggas bara när räknaPlats byts (= språkbyte/login) ──
  useEffect(() => {
    if (!innerRef.current) return
    const observer = new ResizeObserver(räknaPlats)
    observer.observe(innerRef.current)
    räknaPlats()
    return () => observer.disconnect()
  }, [räknaPlats])

  // Stäng dropdowns vid klick utanför
  useEffect(() => {
    function utanför(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false)
      if (merRef.current && !merRef.current.contains(e.target)) setMerOpen(false)
    }
    document.addEventListener('mousedown', utanför)
    return () => document.removeEventListener('mousedown', utanför)
  }, [])

  // Stäng vid navigation
  useEffect(() => {
    setAvatarOpen(false); setMerOpen(false); setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (adminModal) setTimeout(() => adminInputRef.current?.focus(), 50)
    else { setAdminLösenord(''); setAdminFel(null) }
  }, [adminModal])

  function hanteraLogoKlick(e) {
    e.preventDefault()
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      if (tapCount.current === 1) navigate('/')
      tapCount.current = 0
    }, 400)
    if (tapCount.current >= 3) {
      clearTimeout(tapTimer.current); tapCount.current = 0; setAdminModal(true)
    }
  }

  async function hanteraAdminLogin(e) {
    e.preventDefault()
    if (!adminLösenord.trim()) return
    setAdminLaddar(true); setAdminFel(null)
    try {
      const res = await fetch('/.netlify/functions/admin', { headers: { Authorization: `Bearer ${adminLösenord}` } })
      if (res.ok) { sessionStorage.setItem('admin_secret', adminLösenord); setAdminModal(false); navigate('/admin') }
      else { setAdminFel(t('navbar.admin.felLösenord')); setAdminLösenord(''); adminInputRef.current?.focus() }
    } catch { setAdminFel(t('navbar.admin.anslutningsFel')) }
    finally { setAdminLaddar(false) }
  }

  // Forum-badge
  useEffect(() => {
    if (!användare) return
    setOlästa(hämtaOlästa())
    const onLäst = () => setOlästa(0)
    const onStorage = (e) => { if (e.key === OLÄST_KEY || e.key === 'forum_inlägg_cache') setOlästa(hämtaOlästa()) }
    window.addEventListener('forum-läst', onLäst)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('forum-läst', onLäst); window.removeEventListener('storage', onStorage) }
  }, [användare])

  useEffect(() => {
    if (!användare) return
    async function uppdateraCache() {
      try {
        const res = await fetch('/.netlify/functions/forum', { headers: { Authorization: `Bearer ${användare.token}` } })
        if (!res.ok) return
        localStorage.setItem('forum_inlägg_cache', JSON.stringify(await res.json()))
        setOlästa(hämtaOlästa())
      } catch {}
    }
    uppdateraCache()
    const id = setInterval(uppdateraCache, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [användare])

  const forumBadge = olästa > 0 ? (olästa > 99 ? '99+' : olästa) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');
        @media (max-width: 768px) { .desktop-nav { display: none !important; } .hamburger-btn { display: flex !important; } }
        .nav-link { text-decoration:none; padding:7px 12px; border-radius:8px; font-size:.78rem; font-weight:500; letter-spacing:.07em; text-transform:uppercase; transition:background .15s,color .15s; position:relative; white-space:nowrap; font-family:'Barlow',sans-serif; }
        .nav-link:hover { background:rgba(255,255,255,.08); color:rgba(255,255,255,.9) !important; }
        .nav-link.aktiv { background:rgba(197,160,40,.15); color:#F0D060 !important; }
        .avatar-pill { display:flex; align-items:center; gap:7px; background:rgba(197,160,40,.12); border:1px solid rgba(197,160,40,.35); border-radius:100px; padding:4px 11px 4px 4px; cursor:pointer; transition:background .15s; user-select:none; }
        .avatar-pill:hover { background:rgba(197,160,40,.22); }
        .av-cirkel { width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg,#C5A028,#F0D060); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#0a1628; flex-shrink:0; font-family:'Barlow Condensed',sans-serif; }
        .dropdown { position:absolute; top:calc(100% + 8px); right:0; min-width:220px; background:#fff; border:1px solid rgba(0,0,0,.1); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.15); overflow:hidden; z-index:200; animation:fadeDown .15s ease; }
        .dropdown-mer { position:absolute; top:calc(100% + 8px); right:0; min-width:190px; background:#fff; border:1px solid rgba(0,0,0,.1); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.15); overflow:hidden; z-index:200; padding:6px; animation:fadeDown .15s ease; }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .dd-link { text-decoration:none; display:flex; align-items:center; gap:10px; padding:9px 14px; font-size:13px; color:#1a1a1a; transition:background .1s; border-radius:6px; font-family:'Barlow',sans-serif; cursor:pointer; white-space:nowrap; }
        .dd-link:hover { background:#f5f3ef; }
        .mer-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:transparent; border:1px solid rgba(255,255,255,.18); color:rgba(255,255,255,.55); font-size:15px; cursor:pointer; transition:background .15s,color .15s; letter-spacing:2px; font-weight:700; flex-shrink:0; }
        .mer-btn:hover, .mer-btn.open { background:rgba(255,255,255,.1); color:rgba(255,255,255,.9); border-color:rgba(255,255,255,.35); }
        .mob-link { text-decoration:none; display:flex; align-items:center; gap:12px; padding:13px 16px; border-radius:10px; font-size:.95rem; font-weight:500; border-left:3px solid transparent; font-family:'Barlow',sans-serif; }
        .mob-link.aktiv { background:rgba(197,160,40,.15); color:#F0D060; border-left-color:#C5A028; }
        .mob-link:not(.aktiv) { color:rgba(255,255,255,.8); }
        .nav-mätrad { position:fixed; top:-9999px; left:0; visibility:hidden; pointer-events:none; display:flex; gap:4px; z-index:-1; }
        .status-dot { position:absolute; top:0; right:0; width:10px; height:10px; border-radius:50%; border:2px solid #0a1628; pointer-events:none; }
        .status-dot.ok   { background:#5DCAA5; }
        .status-dot.warn { background:#E24B4A; }
        .dd-status-section { padding:10px 14px; border-bottom:1px solid rgba(0,0,0,.07); }
        .dd-status-row { display:flex; align-items:center; gap:7px; margin-bottom:5px; font-size:12px; color:#444; font-family:'Barlow',sans-serif; }
        .dd-status-row:last-of-type { margin-bottom:0; }
        .dd-status-icon { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
        .dd-pbar { flex:1; height:3px; background:rgba(0,0,0,.08); border-radius:2px; overflow:hidden; }
        .dd-pbar-fill { height:100%; border-radius:2px; transition:width .3s; }
        .dd-pbar-fill.ok   { background:#5DCAA5; }
        .dd-pbar-fill.warn { background:#E24B4A; }
        .dd-status-num { font-size:11px; font-weight:600; white-space:nowrap; color:#888; min-width:36px; text-align:right; }
        .mob-status-wrap { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.08); display:flex; flex-direction:column; gap:5px; }
        .mob-status-row { display:flex; align-items:center; gap:7px; font-size:12px; color:rgba(255,255,255,.55); font-family:'Barlow',sans-serif; }
        .mob-pbar { flex:1; height:3px; background:rgba(255,255,255,.1); border-radius:2px; overflow:hidden; }
        .mob-pbar-fill { height:100%; border-radius:2px; }
        .mob-pbar-fill.ok   { background:#5DCAA5; }
        .mob-pbar-fill.warn { background:#E24B4A; }
        .mob-status-num { font-size:11px; font-weight:600; color:rgba(255,255,255,.35); min-width:36px; text-align:right; }
      `}</style>

      {/* Osynlig mätrad — utanför nav */}
      <div ref={mätRef} className="nav-mätrad" aria-hidden="true">
        {allaLänkar.map(({ to, label }) => (
          <span key={to} className="nav-link" style={{ color:'transparent' }}>{label}</span>
        ))}
      </div>

      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'linear-gradient(135deg,#0a1628 0%,#1a2e4a 100%)', borderBottom:'1px solid rgba(197,160,40,.3)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
        <div ref={innerRef} style={{ maxWidth:1100, margin:'0 auto', padding:'0 1.25rem', height:60, display:'flex', alignItems:'center', gap:'0.5rem' }}>

          {/* Logo */}
          <div onClick={hanteraLogoKlick} style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, cursor:'pointer', userSelect:'none', marginRight:8 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#C5A028,#F0D060)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>⚽</div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'1rem', letterSpacing:'.06em', textTransform:'uppercase', color:'#F0D060', lineHeight:1.1 }}>VM-tipsen</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', textTransform:'uppercase' }}>2026</div>
            </div>
          </div>

          {/* Desktop */}
          <div className="desktop-nav" style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>

            {synliga.map(({ to, label }) => (
              <Link key={to} to={to} className={`nav-link${isActive(to) ? ' aktiv' : ''}`} style={{ color: isActive(to) ? '#F0D060' : 'rgba(255,255,255,.6)' }}>
                {label}
                {to === '/forum' && forumBadge && (
                  <span style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, borderRadius:'100px', background:'#C8102E', color:'#fff', fontSize:9, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 3px', fontFamily:"'Barlow Condensed',sans-serif", pointerEvents:'none' }}>{forumBadge}</span>
                )}
              </Link>
            ))}

            {overflow.length > 0 && (
              <div ref={merRef} style={{ position:'relative', flexShrink:0 }}>
                <button className={`mer-btn${merOpen ? ' open' : ''}`} onClick={() => setMerOpen(v => !v)} aria-label="Fler sidor">···</button>
                {merOpen && (
                  <div className="dropdown-mer">
                    {overflow.map(({ to, label, icon }) => (
                      <Link key={to} to={to} className="dd-link" style={{ color: isActive(to) ? '#C8102E' : '#1a1a1a' }}>
                        <span style={{ fontSize:16, width:20, textAlign:'center' }}>{icon}</span>
                        {label}
                        {to === '/forum' && forumBadge && (
                          <span style={{ marginLeft:'auto', minWidth:16, height:16, borderRadius:'100px', background:'#C8102E', color:'#fff', fontSize:9, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{forumBadge}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              {användare ? (
                <div ref={avatarRef} style={{ position:'relative' }}>
                  <div className="avatar-pill" onClick={() => setAvatarOpen(v => !v)} role="button" aria-expanded={avatarOpen}>
                    <div style={{ position:'relative' }}>
                      <div className="av-cirkel">{initialer(användare.namn)}</div>
                      {!myStatus.laddar && myStatus.matchTotal > 0 && (
                        <span className={`status-dot ${myStatus.allaKlara ? 'ok' : 'warn'}`} aria-hidden="true" />
                      )}
                    </div>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:500, fontFamily:"'Barlow',sans-serif" }}>{förnamn(användare.namn)}</span>
                    <span style={{ fontSize:9, color:'rgba(255,255,255,.4)', transition:'transform .2s', transform: avatarOpen ? 'rotate(180deg)' : 'none', display:'block' }}>▾</span>
                  </div>
                  {avatarOpen && (
                    <div className="dropdown">
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,.07)', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#C5A028,#F0D060)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#0a1628', fontFamily:"'Barlow Condensed',sans-serif" }}>{initialer(användare.namn)}</div>
                          {!myStatus.laddar && myStatus.matchTotal > 0 && (
                            <span className={`status-dot ${myStatus.allaKlara ? 'ok' : 'warn'}`} style={{ borderColor:'#fff' }} aria-hidden="true" />
                          )}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:14, fontWeight:600, color:'#0a1628', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{användare.namn}</p>
                          <p style={{ margin:0, fontFamily:"'Barlow',sans-serif", fontSize:12, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{användare.email || ''}</p>
                        </div>
                      </div>
                      {!myStatus.laddar && myStatus.matchTotal > 0 && (
                        <div className="dd-status-section">
                          {/* Före deadline: visa gruppspelsstatus */}
                          {!myStatus.efterDeadline && (
                            <div className="dd-status-row">
                              <span className="dd-status-icon">{myStatus.matchDone >= myStatus.matchTotal ? '✅' : '⚠️'}</span>
                              <span style={{ flex:'0 0 auto' }}>Matcher</span>
                              <div className="dd-pbar">
                                <div className={`dd-pbar-fill ${myStatus.matchDone >= myStatus.matchTotal ? 'ok' : 'warn'}`}
                                  style={{ width:`${Math.round(myStatus.matchDone / myStatus.matchTotal * 100)}%` }} />
                              </div>
                              <span className="dd-status-num">{myStatus.matchDone}/{myStatus.matchTotal}</span>
                            </div>
                          )}
                          {/* Efter deadline: visa aktiv slutspelsomgång */}
                          {myStatus.efterDeadline && myStatus.slutspel && (
                            <div className="dd-status-row">
                              <span className="dd-status-icon">{myStatus.slutspel.done >= myStatus.slutspel.total ? '✅' : '⚠️'}</span>
                              <span style={{ flex:'0 0 auto', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{myStatus.slutspel.omgång}</span>
                              <div className="dd-pbar">
                                <div className={`dd-pbar-fill ${myStatus.slutspel.done >= myStatus.slutspel.total ? 'ok' : 'warn'}`}
                                  style={{ width:`${Math.round(myStatus.slutspel.done / myStatus.slutspel.total * 100)}%` }} />
                              </div>
                              <span className="dd-status-num">{myStatus.slutspel.done}/{myStatus.slutspel.total}</span>
                            </div>
                          )}
                          {/* Frågor — visas alltid */}
                          {myStatus.frågaTotal > 0 && (
                            <div className="dd-status-row">
                              <span className="dd-status-icon">{myStatus.frågaDone >= myStatus.frågaTotal ? '✅' : '⚠️'}</span>
                              <span style={{ flex:'0 0 auto' }}>Frågor</span>
                              <div className="dd-pbar">
                                <div className={`dd-pbar-fill ${myStatus.frågaDone >= myStatus.frågaTotal ? 'ok' : 'warn'}`}
                                  style={{ width:`${Math.round(myStatus.frågaDone / myStatus.frågaTotal * 100)}%` }} />
                              </div>
                              <span className="dd-status-num">{myStatus.frågaDone}/{myStatus.frågaTotal}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ padding:'6px' }}>
                        <Link to="/mitt-vin" className="dd-link"><span style={{ fontSize:16 }}>🍾</span>{t('navbar.links.minVin')}</Link>
                        <Link to={`/participant/${användare.user_id}`} className="dd-link"><span style={{ fontSize:16 }}>👤</span>{t('navbar.minProfil')}</Link>
                      </div>
                      <div style={{ borderTop:'1px solid rgba(0,0,0,.07)', padding:'6px' }}>
                        <button onClick={() => { logga_ut(); setAvatarOpen(false) }}
                          className="dd-link" style={{ width:'100%', background:'none', border:'none', color:'#C8102E', textAlign:'left' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(200,16,46,.06)'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}
                        ><span style={{ fontSize:16 }}>🚪</span>{t('navbar.loggaUt')}</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="nav-link" style={{ color:'rgba(255,255,255,.6)' }}>{t('navbar.loggaIn')}</Link>
                  <Link to="/register" style={{ textDecoration:'none', padding:'8px 18px', borderRadius:8, background:'linear-gradient(135deg,#C5A028,#F0D060)', color:'#0a1628', fontSize:'.78rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap', fontFamily:"'Barlow Condensed',sans-serif" }}>{t('navbar.anmälDig')}</Link>
                </>
              )}
              <LanguageSwitcher />
            </div>
          </div>

          {/* Hamburger */}
          <div style={{ marginLeft:'auto', display:'none', alignItems:'center', gap:8 }} className="hamburger-btn">
            {/* Statusdot på mobil — synlig utan att öppna menyn */}
            {användare && !myStatus.laddar && myStatus.matchTotal > 0 && (
              <span
                style={{
                  width:10, height:10, borderRadius:'50%',
                  background: myStatus.allaKlara ? '#5DCAA5' : '#E24B4A',
                  border:'2px solid rgba(255,255,255,.25)',
                  flexShrink:0,
                }}
                aria-label={myStatus.allaKlara ? 'Alla tips inlämnade' : 'Tips saknas'}
              />
            )}
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Meny" style={{ display:'flex', flexDirection:'column', gap:5, background:'none', border:'none', padding:6, cursor:'pointer' }}>
              <span style={{ display:'block', width:24, height:2, background:'#fff', borderRadius:2, transition:'all .3s', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
              <span style={{ display:'block', width:24, height:2, background:'#fff', borderRadius:2, transition:'all .3s', opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display:'block', width:24, height:2, background:'#fff', borderRadius:2, transition:'all .3s', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:49, background:'rgba(0,0,0,.6)' }} />}

      {/* Mobile drawer */}
      <div style={{ position:'fixed', top:60, left:0, right:0, zIndex:50, background:'linear-gradient(180deg,#0d1f3c 0%,#0a1628 100%)', borderBottom:'1px solid rgba(197,160,40,.2)', transform: menuOpen ? 'translateY(0)' : 'translateY(-110%)', transition:'transform .3s cubic-bezier(.4,0,.2,1)', padding:'1rem 1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:4 }}>
        {användare && (
          <div style={{ padding:'10px 16px', background:'rgba(197,160,40,.08)', borderRadius:10, marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#C5A028,#F0D060)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#0a1628', fontFamily:"'Barlow Condensed',sans-serif" }}>{initialer(användare.namn)}</div>
                {!myStatus.laddar && myStatus.matchTotal > 0 && (
                  <span className={`status-dot ${myStatus.allaKlara ? 'ok' : 'warn'}`} style={{ borderColor:'#0d1f3c' }} aria-hidden="true" />
                )}
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#F0D060', fontFamily:"'Barlow',sans-serif" }}>{användare.namn}</p>
                <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,.4)', fontFamily:"'Barlow',sans-serif" }}>{användare.email || ''}</p>
              </div>
            </div>
            {!myStatus.laddar && myStatus.matchTotal > 0 && (
              <div className="mob-status-wrap">
                {/* Före deadline: gruppspel */}
                {!myStatus.efterDeadline && (
                  <div className="mob-status-row">
                    <span style={{ fontSize:11 }}>{myStatus.matchDone >= myStatus.matchTotal ? '✅' : '⚠️'}</span>
                    <span>Matcher</span>
                    <div className="mob-pbar">
                      <div className={`mob-pbar-fill ${myStatus.matchDone >= myStatus.matchTotal ? 'ok' : 'warn'}`}
                        style={{ width:`${Math.round(myStatus.matchDone / myStatus.matchTotal * 100)}%` }} />
                    </div>
                    <span className="mob-status-num">{myStatus.matchDone}/{myStatus.matchTotal}</span>
                  </div>
                )}
                {/* Efter deadline: aktiv slutspelsomgång */}
                {myStatus.efterDeadline && myStatus.slutspel && (
                  <div className="mob-status-row">
                    <span style={{ fontSize:11 }}>{myStatus.slutspel.done >= myStatus.slutspel.total ? '✅' : '⚠️'}</span>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:90 }}>{myStatus.slutspel.omgång}</span>
                    <div className="mob-pbar">
                      <div className={`mob-pbar-fill ${myStatus.slutspel.done >= myStatus.slutspel.total ? 'ok' : 'warn'}`}
                        style={{ width:`${Math.round(myStatus.slutspel.done / myStatus.slutspel.total * 100)}%` }} />
                    </div>
                    <span className="mob-status-num">{myStatus.slutspel.done}/{myStatus.slutspel.total}</span>
                  </div>
                )}
                {/* Frågor — alltid */}
                {myStatus.frågaTotal > 0 && (
                  <div className="mob-status-row">
                    <span style={{ fontSize:11 }}>{myStatus.frågaDone >= myStatus.frågaTotal ? '✅' : '⚠️'}</span>
                    <span>Frågor</span>
                    <div className="mob-pbar">
                      <div className={`mob-pbar-fill ${myStatus.frågaDone >= myStatus.frågaTotal ? 'ok' : 'warn'}`}
                        style={{ width:`${Math.round(myStatus.frågaDone / myStatus.frågaTotal * 100)}%` }} />
                    </div>
                    <span className="mob-status-num">{myStatus.frågaDone}/{myStatus.frågaTotal}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {allaLänkar.map(({ to, label, icon }) => (
          <Link key={to} to={to} onClick={() => setMenuOpen(false)} className={`mob-link${isActive(to) ? ' aktiv' : ''}`}>
            <span style={{ fontSize:18, width:24, textAlign:'center', position:'relative' }}>
              {icon}
              {to === '/forum' && forumBadge && <span style={{ position:'absolute', top:-6, right:-8, minWidth:16, height:16, borderRadius:'100px', background:'#C8102E', color:'#fff', fontSize:9, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>{forumBadge}</span>}
            </span>
            {label}
          </Link>
        ))}
        {användare && (
          <Link to="/mitt-vin" onClick={() => setMenuOpen(false)} className={`mob-link${isActive('/mitt-vin') ? ' aktiv' : ''}`}>
            <span style={{ fontSize:18, width:24, textAlign:'center' }}>🍾</span>{t('navbar.links.minVin')}
          </Link>
        )}
        <div style={{ height:1, background:'rgba(255,255,255,.08)', margin:'.5rem 0' }} />
        <div style={{ padding:'6px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:'rgba(255,255,255,.4)', fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'.1em', textTransform:'uppercase' }}>Language</span>
          <LanguageSwitcher mobile />
        </div>
        <div style={{ height:1, background:'rgba(255,255,255,.08)', margin:'.25rem 0' }} />
        {användare ? (
          <button onClick={() => { logga_ut(); setMenuOpen(false) }} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(200,16,46,.08)', borderRadius:10, border:'none', cursor:'pointer', color:'#ff6b6b', fontFamily:"'Barlow',sans-serif", fontSize:'.9rem', fontWeight:500 }}>
            <span style={{ fontSize:18 }}>🚪</span>{t('navbar.loggaUt')}
          </button>
        ) : (
          <div style={{ display:'flex', gap:8, padding:'4px 0' }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ flex:1, textDecoration:'none', textAlign:'center', padding:'12px', borderRadius:10, border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.8)', fontSize:'.9rem', fontWeight:500 }}>{t('navbar.loggaIn')}</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ flex:1, textDecoration:'none', textAlign:'center', padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#C5A028,#F0D060)', color:'#0a1628', fontSize:'.9rem', fontWeight:700 }}>{t('navbar.anmälDig')}</Link>
          </div>
        )}
      </div>

      {/* Admin-modal */}
      {adminModal && (
        <>
          <div onClick={() => setAdminModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1000 }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:16, padding:'2rem', width:'min(340px,calc(100vw - 2rem))', zIndex:1001, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'1.4rem', fontWeight:700, color:'#0a1628', textAlign:'center', margin:'0 0 1.25rem' }}>⚙️ {t('navbar.admin.titel')}</h2>
            {adminFel && <div style={{ background:'rgba(200,16,46,.06)', border:'1px solid rgba(200,16,46,.2)', borderRadius:8, padding:'.75rem 1rem', fontSize:13, color:'#8a1020', marginBottom:'1rem', lineHeight:1.5 }}>{adminFel}</div>}
            <form onSubmit={hanteraAdminLogin}>
              <input ref={adminInputRef} type="password" value={adminLösenord} onChange={e => setAdminLösenord(e.target.value)} placeholder={t('navbar.admin.lösenord')} style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e0dbd3', borderRadius:9, padding:'11px 14px', fontSize:15, fontFamily:"'Barlow',sans-serif", color:'#0a1628', background:'#faf8f4', outline:'none', marginBottom:'.75rem' }} />
              <button type="submit" disabled={!adminLösenord.trim() || adminLaddar} style={{ width:'100%', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'1rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', background:'linear-gradient(135deg,#0a1628,#1a2e4a)', color:'#F0D060', border:'none', borderRadius:9, padding:'12px', cursor: adminLösenord.trim() && !adminLaddar ? 'pointer' : 'not-allowed', opacity: adminLösenord.trim() && !adminLaddar ? 1 : 0.5 }}>
                {adminLaddar ? t('navbar.admin.kontrollerar') : t('navbar.admin.loggaIn')}
              </button>
            </form>
            <button onClick={() => setAdminModal(false)} style={{ display:'block', width:'100%', marginTop:'.75rem', background:'none', border:'none', cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'#bbb', padding:'6px' }}>{t('navbar.admin.avbryt')}</button>
          </div>
        </>
      )}
    </>
  )
}
