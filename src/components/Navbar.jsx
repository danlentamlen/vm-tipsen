import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { to: '/matches', label: 'Matcher', icon: '📅' },
  { to: '/leaderboard', label: 'Topplista', icon: '🏆' },
  { to: '/questions', label: 'Tilläggsfrågor', icon: '🎯' },
  { to: '/participants', label: 'Deltagare', icon: '👥' },
  { to: '/vinpotten', label: 'Vinpotten', icon: '🍷' },
  { to: '/skytteliga', label: 'Skytteliga', icon: '👟' },
  { to: '/info', label: 'Regler', icon: '📋' },
]

export default function Navbar() {
  const { användare, logga_ut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

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
          padding: '0 1.25rem',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
          </Link>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }} className="desktop-nav">
            {navLinks.map(({ to, label }) => (
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
              }}>
                {label}
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
                  textDecoration: 'none', marginLeft: 4,
                  padding: '8px 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #C5A028, #F0D060)',
                  color: '#0a1628', fontSize: '0.78rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>Anmäl dig</Link>
              </>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hamburger-btn"
            aria-label="Öppna meny"
            style={{
              display: 'none',
              flexDirection: 'column', gap: 5,
              background: 'none', border: 'none',
              padding: 6, cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            <span style={{
              display: 'block', width: 24, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'all 0.3s',
              transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display: 'block', width: 24, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'all 0.3s',
              opacity: menuOpen ? 0 : 1,
            }} />
            <span style={{
              display: 'block', width: 24, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'all 0.3s',
              transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }} />
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)',
          }}
        />
      )}
      <div style={{
        position: 'fixed', top: 60, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)',
        borderBottom: '1px solid rgba(197,160,40,0.2)',
        transform: menuOpen ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '1rem 1.25rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: 4,
      }} className="mobile-menu">
        {navLinks.map(({ to, label, icon }) => (
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
            }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
            {label}
          </Link>
        ))}
        {användare && (
          <Link to="/mitt-vin" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 10, color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: 500, borderLeft: '3px solid transparent' }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>🍾</span>
            Min vinflaska
          </Link>
        )}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
        {användare ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Inloggad som <strong style={{ color: '#F0D060' }}>{användare.namn}</strong></span>
            <button onClick={() => { logga_ut(); setMenuOpen(false) }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(197,160,40,0.4)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
              Logga ut
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 500 }}>
              Logga in
            </Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg, #C5A028, #F0D060)', color: '#0a1628', fontSize: '0.9rem', fontWeight: 700 }}>
              Anmäl dig
            </Link>
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
    </>
  )
}