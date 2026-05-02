import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const OLÄST_KEY = 'forum_senast_läst'

// inloggadKrävs: true = dölj för icke-inloggade
const navLinks = [
  { to: '/matches',      label: 'Matcher',       icon: '📅',  inloggadKrävs: false },
  { to: '/leaderboard',  label: 'Topplista',      icon: '🏆',  inloggadKrävs: false },
  { to: '/questions',    label: 'Tilläggsfrågor', icon: '🎯',  inloggadKrävs: false },
  { to: '/participants', label: 'Deltagare',      icon: '👥',  inloggadKrävs: true  },
  { to: '/vinpotten',    label: 'Vinpotten',      icon: '🍷',  inloggadKrävs: false },
  { to: '/skytteliga',   label: 'Skytteliga',     icon: '👟',  inloggadKrävs: false },
  { to: '/forum',        label: 'Forum',          icon: '💬',  inloggadKrävs: true  },
  { to: '/info',         label: 'Regler',         icon: '📋',  inloggadKrävs: false },
]

// Räkna olästa foruminlägg baserat på localStorage-tidsstämpel
function hämtaOlästa() {
  try {
    const senastLäst = localStorage.getItem(OLÄST_KEY)
    const cachadData = localStorage.getItem('forum_inlägg_cache')
    if (!cachadData) return 0
    const inlägg = JSON.parse(cachadData)
    if (!senastLäst) return inlägg.length
    const gräns = new Date(senastLäst)
    return inlägg.filter((p) => new Date(p.created_at) > gräns).length
  } catch {
    return 0
  }
}

export default function Navbar() {
  const { användare, logga_ut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [olästa, setOlästa] = useState(0)
  const [adminModal, setAdminModal] = useState(false)
  const [adminLösenord, setAdminLösenord] = useState('')
  const [adminFel, setAdminFel] = useState(null)
  const [adminLaddar, setAdminLaddar] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const tapCount = useRef(0)
  const tapTimer = useRef(null)
  const adminInputRef = useRef(null)

  // Fokusera lösenordsfältet när modalen öppnas
  useEffect(() => {
    if (adminModal) {
      setTimeout(() => adminInputRef.current?.focus(), 50)
    } else {
      setAdminLösenord('')
      setAdminFel(null)
    }
  }, [adminModal])

  // Triple-tap på logon — öppnar admin-modal
  function hanteraLogoKlick(e) {
    e.preventDefault()
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      if (tapCount.current === 1) navigate('/')
      tapCount.current = 0
    }, 400)
    if (tapCount.current >= 3) {
      clearTimeout(tapTimer.current)
      tapCount.current = 0
      setAdminModal(true)
    }
  }

  async function hanteraAdminLogin(e) {
    e.preventDefault()
    if (!adminLösenord.trim()) return
    setAdminLaddar(true)
    setAdminFel(null)
    try {
      const res = await fetch('/.netlify/functions/admin', {
        headers: { Authorization: `Bearer ${adminLösenord}` },
      })
      if (res.ok) {
        localStorage.setItem('admin_secret', adminLösenord)
        setAdminModal(false)
        navigate('/admin')
      } else {
        setAdminFel('Fel lösenord, försök igen.')
        setAdminLösenord('')
        adminInputRef.current?.focus()
      }
    } catch {
      setAdminFel('Kunde inte ansluta, försök igen.')
    } finally {
      setAdminLaddar(false)
    }
  }

  const isActive = (path) => location.pathname === path

  const synligaLänkar = navLinks.filter(
    ({ inloggadKrävs }) => !inloggadKrävs || !!användare
  )

  // Uppdatera oläst-räknaren
  useEffect(() => {
    if (!användare) return
    setOlästa(hämtaOlästa())

    // Lyssna på när Forum-sidan markerar allt som läst
    function hanteraLäst() { setOlästa(0) }
    window.addEventListener('forum-läst', hanteraLäst)

    // Lyssna på storage-ändringar (t.ex. ny data cachad)
    function hanteraStorage(e) {
      if (e.key === OLÄST_KEY || e.key === 'forum_inlägg_cache') {
        setOlästa(hämtaOlästa())
      }
    }
    window.addEventListener('storage', hanteraStorage)

    return () => {
      window.removeEventListener('forum-läst', hanteraLäst)
      window.removeEventListener('storage', hanteraStorage)
    }
  }, [användare])

  // Cacha foruminlägg i bakgrunden för att räkna olästa utan att öppna forumet
  useEffect(() => {
    if (!användare) return
    // Hämta senaste inlägg var 2:a minut för att hålla räknaren uppdaterad
    async function uppdateraCache() {
      try {
        const res = await fetch('/.netlify/functions/forum', {
          headers: { Authorization: `Bearer ${användare.token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        localStorage.setItem('forum_inlägg_cache', JSON.stringify(data))
        setOlästa(hämtaOlästa())
      } catch {
        // tyst fel — påverkar inte UI
      }
    }

    uppdateraCache()
    const interval = setInterval(uppdateraCache, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [användare])

  const forumBadge = olästa > 0 ? olästa : null

  return (
    <>
      {/* ── Top bar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%)',
        borderBottom: '1px solid rgba(197,160,40,0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 1.25rem', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          {/* Logo — triple-tap öppnar admin-login */}
          <div
            onClick={hanteraLogoKlick}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C5A028, #F0D060)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>⚽</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F0D060', lineHeight: 1.1 }}>
                VM-tipsen
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                2026
              </div>
            </div>
          </div>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }} className="desktop-nav">
            {synligaLänkar.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                textDecoration: 'none',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 500,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: isActive(to) ? '#F0D060' : 'rgba(255,255,255,0.6)',
                background: isActive(to) ? 'rgba(197,160,40,0.15)' : 'transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}>
                {label}
                {to === '/forum' && forumBadge && (
                  <span style={{
                    position: 'absolute',
                    top: 2, right: 2,
                    minWidth: 17, height: 17,
                    borderRadius: '100px',
                    background: '#C8102E',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: 0,
                  }}>
                    {forumBadge > 99 ? '99+' : forumBadge}
                  </span>
                )}
              </Link>
            ))}
            {användare ? (
              <>
                <Link to="/mitt-vin" style={{ textDecoration: 'none', padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: isActive('/mitt-vin') ? '#F0D060' : 'rgba(255,255,255,0.6)', background: isActive('/mitt-vin') ? 'rgba(197,160,40,0.15)' : 'transparent' }}>
                  Min vinflaska
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginLeft: 4 }}>
                  {användare.namn}
                </span>
                <button onClick={logga_ut} style={{
                  marginLeft: 8, padding: '7px 18px', borderRadius: 8,
                  border: '1px solid rgba(197,160,40,0.4)',
                  background: 'transparent', color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.06em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>Logga ut</button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: 'none', padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                  Logga in
                </Link>
                <Link to="/register" style={{
                  textDecoration: 'none', marginLeft: 4, padding: '8px 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #C5A028, #F0D060)',
                  color: '#0a1628', fontSize: '0.78rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>Anmäl dig</Link>
              </>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hamburger-btn"
            aria-label="Öppna meny"
            style={{ display: 'none', flexDirection: 'column', gap: 5, background: 'none', border: 'none', padding: 6, cursor: 'pointer', marginLeft: 'auto' }}
          >
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.6)' }} />
      )}

      {/* ── Mobile drawer ── */}
      <div style={{
        position: 'fixed', top: 60, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)',
        borderBottom: '1px solid rgba(197,160,40,0.2)',
        transform: menuOpen ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '1rem 1.25rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: 4,
      }} className="mobile-menu">
        {synligaLänkar.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMenuOpen(false)}
            style={{
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', borderRadius: 10,
              background: isActive(to) ? 'rgba(197,160,40,0.15)' : 'transparent',
              color: isActive(to) ? '#F0D060' : 'rgba(255,255,255,0.8)',
              fontSize: '0.95rem', fontWeight: 500,
              borderLeft: isActive(to) ? '3px solid #C5A028' : '3px solid transparent',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', position: 'relative' }}>
              {icon}
              {to === '/forum' && forumBadge && (
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  minWidth: 16, height: 16, borderRadius: '100px',
                  background: '#C8102E', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {forumBadge > 99 ? '99+' : forumBadge}
                </span>
              )}
            </span>
            {label}
          </Link>
        ))}
        {användare && (
          <Link to="/mitt-vin" onClick={() => setMenuOpen(false)} style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 16px', borderRadius: 10,
            color: isActive('/mitt-vin') ? '#F0D060' : 'rgba(255,255,255,0.8)',
            fontSize: '0.95rem', fontWeight: 500,
            background: isActive('/mitt-vin') ? 'rgba(197,160,40,0.15)' : 'transparent',
            borderLeft: isActive('/mitt-vin') ? '3px solid #C5A028' : '3px solid transparent',
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>🍾</span>
            Min vinflaska
          </Link>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />

        {användare ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Inloggad som <strong style={{ color: '#F0D060' }}>{användare.namn}</strong>
            </span>
            <button onClick={() => { logga_ut(); setMenuOpen(false) }} style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid rgba(197,160,40,0.4)',
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              fontSize: 13, cursor: 'pointer',
            }}>
              Logga ut
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{
              flex: 1, textDecoration: 'none', textAlign: 'center', padding: '12px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 500,
            }}>Logga in</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{
              flex: 1, textDecoration: 'none', textAlign: 'center', padding: '12px', borderRadius: 10,
              background: 'linear-gradient(135deg, #C5A028, #F0D060)', color: '#0a1628', fontSize: '0.9rem', fontWeight: 700,
            }}>Anmäl dig</Link>
          </div>
        )}
      </div>

      {/* ── Responsive CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=swap');
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .mobile-menu { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; transform: none !important; }
          .hamburger-btn { display: none !important; }
        }
      `}</style>

      {/* ── Admin-login modal ── */}
      {adminModal && (
        <>
          <div
            onClick={() => setAdminModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 201,
            background: '#fff',
            borderRadius: 16,
            padding: '2rem 1.75rem',
            width: '90%', maxWidth: 360,
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0a1628, #1a2e4a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, margin: '0 auto 0.75rem',
              }}>⚙️</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.3rem', letterSpacing: '0.04em', color: '#0a1628' }}>
                Adminpanel
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>VM-tipsen 2026</div>
            </div>

            {adminFel && (
              <div style={{
                background: 'rgba(200,16,46,0.06)',
                border: '1px solid rgba(200,16,46,0.2)',
                borderRadius: 8, padding: '0.75rem 1rem',
                fontSize: 13, color: '#8a1020',
                marginBottom: '1rem', lineHeight: 1.5,
              }}>
                {adminFel}
              </div>
            )}

            <form onSubmit={hanteraAdminLogin}>
              <input
                ref={adminInputRef}
                type="password"
                value={adminLösenord}
                onChange={(e) => setAdminLösenord(e.target.value)}
                placeholder="Lösenord"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1px solid #e0dbd3',
                  borderRadius: 9, padding: '11px 14px',
                  fontSize: 15, fontFamily: "'Barlow', sans-serif",
                  color: '#0a1628', background: '#faf8f4',
                  outline: 'none', marginBottom: '0.75rem',
                }}
              />
              <button
                type="submit"
                disabled={!adminLösenord.trim() || adminLaddar}
                style={{
                  width: '100%',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '1rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, #0a1628, #1a2e4a)',
                  color: '#F0D060', border: 'none',
                  borderRadius: 9, padding: '12px',
                  cursor: adminLösenord.trim() && !adminLaddar ? 'pointer' : 'not-allowed',
                  opacity: adminLösenord.trim() && !adminLaddar ? 1 : 0.5,
                }}
              >
                {adminLaddar ? 'Kontrollerar...' : 'Logga in'}
              </button>
            </form>

            <button
              onClick={() => setAdminModal(false)}
              style={{
                display: 'block', width: '100%', marginTop: '0.75rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow', sans-serif", fontSize: 13,
                color: '#bbb', padding: '6px',
              }}
            >
              Avbryt
            </button>
          </div>
        </>
      )}
    </>
  )
}