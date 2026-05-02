import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const OLÄST_KEY = 'forum_senast_läst'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap');

  .forum-wrap {
    max-width: 680px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }

  .forum-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #C5A028;
    margin-bottom: 0.35rem;
  }

  .forum-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: #0a1628;
    letter-spacing: 0.03em;
    margin-bottom: 1.75rem;
  }

  .compose-box {
    background: #fff;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.08);
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .compose-ta {
    width: 100%;
    border: 1px solid #e5e0d8;
    border-radius: 9px;
    padding: 10px 13px;
    font-size: 14px;
    font-family: 'Barlow', sans-serif;
    color: #0a1628;
    background: #faf8f4;
    resize: none;
    min-height: 76px;
    outline: none;
    transition: border-color 0.15s;
    line-height: 1.5;
  }
  .compose-ta:focus { border-color: #C5A028; }
  .compose-ta::placeholder { color: #bbb; }

  .compose-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }

  .compose-who {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: #999;
    font-family: 'Barlow', sans-serif;
  }

  .pub-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #C5A028, #F0D060);
    color: #0a1628;
    border: none;
    border-radius: 8px;
    padding: 8px 20px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .pub-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .pub-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  /* Post card */
  .post-card {
    background: #fff;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.07);
    padding: 1rem 1.25rem;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: box-shadow 0.15s;
    position: relative;
  }
  .post-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .post-card.är-ny { border-left: 3px solid #C5A028; }

  .ny-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #C5A028, #F0D060);
    color: #0a1628;
    border-radius: 100px;
    padding: 2px 8px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .post-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 11px;
  }

  .post-body {
    font-size: 14.5px;
    color: #1a1a2e;
    line-height: 1.65;
    margin-bottom: 13px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .post-foot {
    display: flex;
    gap: 12px;
    align-items: center;
    border-top: 1px solid rgba(0,0,0,0.06);
    padding-top: 10px;
  }

  .act-btn {
    background: none;
    border: none;
    font-size: 13px;
    color: #aaa;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Barlow', sans-serif;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.12s, color 0.12s;
  }
  .act-btn:hover { background: #f4f1eb; color: #0a1628; }
  .act-btn.liked { color: #C5A028; font-weight: 600; }

  /* Admin delete-knapp */
  .delete-btn {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 15px;
    color: #ddd;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    line-height: 1;
  }
  .delete-btn:hover { color: #C8102E; background: rgba(200,16,46,0.07); }

  /* Bekräftelse-dialog för radering */
  .delete-confirm {
    background: rgba(200,16,46,0.06);
    border: 1px solid rgba(200,16,46,0.2);
    border-radius: 9px;
    padding: 10px 14px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #8a1020;
    font-family: 'Barlow', sans-serif;
  }
  .delete-confirm-ja {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: #C8102E;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
    margin-left: auto;
  }
  .delete-confirm-nej {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: none;
    color: #aaa;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
  }

  /* Avatar */
  .av {
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 700; flex-shrink: 0;
  }
  .av-sm { width: 26px; height: 26px; font-size: 10px; }
  .av-c0 { background: #fdf3d7; color: #7a5c10; }
  .av-c1 { background: #e8eaf6; color: #303f9f; }
  .av-c2 { background: #fce4ec; color: #880e4f; }
  .av-c3 { background: #e0f2f1; color: #00695c; }
  .av-c4 { background: #ede7f6; color: #4527a0; }
  .av-c5 { background: #e8f5e9; color: #2e7d32; }
  .av-c6 { background: #fff3e0; color: #e65100; }
  .av-c7 { background: #e3f2fd; color: #0d47a1; }

  .post-name {
    font-size: 14px; font-weight: 600; color: #0a1628;
    line-height: 1.2; font-family: 'Barlow', sans-serif;
  }
  .post-time { font-size: 12px; color: #bbb; font-family: 'Barlow', sans-serif; }

  /* Replies */
  .replies-wrap {
    margin: 10px 0 0 48px;
    display: flex; flex-direction: column; gap: 7px;
  }
  .reply-card {
    background: #f9f7f2; border-radius: 9px;
    padding: 10px 13px; position: relative;
  }
  .reply-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
  }
  .reply-name { font-size: 13px; font-weight: 600; color: #0a1628; font-family: 'Barlow', sans-serif; }
  .reply-time { font-size: 11.5px; color: #ccc; font-family: 'Barlow', sans-serif; }
  .reply-text { font-size: 13.5px; color: #333; line-height: 1.55; white-space: pre-wrap; word-break: break-word; font-family: 'Barlow', sans-serif; }

  .reply-delete-btn {
    margin-left: auto;
    background: none; border: none; font-size: 13px;
    color: #ddd; cursor: pointer; padding: 2px 5px;
    border-radius: 5px; transition: color 0.15s, background 0.15s;
  }
  .reply-delete-btn:hover { color: #C8102E; background: rgba(200,16,46,0.07); }

  /* Reply compose */
  .reply-compose {
    margin: 8px 0 0 48px;
    display: flex; gap: 8px; align-items: flex-start;
  }
  .reply-ta {
    flex: 1; border: 1px solid #e5e0d8; border-radius: 8px;
    padding: 8px 11px; font-size: 13px; font-family: 'Barlow', sans-serif;
    color: #0a1628; background: #faf8f4; resize: none;
    min-height: 56px; outline: none; transition: border-color 0.15s; line-height: 1.5;
  }
  .reply-ta:focus { border-color: #C5A028; }
  .reply-ta::placeholder { color: #ccc; }
  .reply-send-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    background: #0a1628; color: #F0D060; border: none; border-radius: 8px;
    padding: 8px 14px; cursor: pointer; white-space: nowrap; margin-top: 2px;
    transition: opacity 0.15s;
  }
  .reply-send-btn:hover { opacity: 0.85; }
  .reply-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Laddning / Tom */
  .forum-loading { text-align: center; padding: 3rem 1rem; color: #aaa; font-family: 'Barlow', sans-serif; font-size: 14px; }
  .forum-empty { text-align: center; padding: 3rem 1rem; color: #aaa; }
  .forum-empty p:first-child { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .forum-empty p:last-child { font-size: 14px; font-family: 'Barlow', sans-serif; }

  /* Inloggningsspärr */
  .forum-locked {
    max-width: 420px; margin: 4rem auto; text-align: center;
    padding: 2rem 1.5rem; background: #fff;
    border-radius: 16px; border: 1px solid rgba(0,0,0,0.07);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .forum-locked-icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .forum-locked h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.4rem; font-weight: 700; color: #0a1628; margin-bottom: 0.5rem; }
  .forum-locked p { font-size: 14px; color: #888; font-family: 'Barlow', sans-serif; line-height: 1.6; margin-bottom: 1.5rem; }
  .forum-locked-btn {
    display: inline-block; padding: 12px 28px; border-radius: 10px;
    font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    background: linear-gradient(135deg, #C5A028, #F0D060);
    color: #0a1628; text-decoration: none; transition: opacity 0.15s, transform 0.1s;
  }
  .forum-locked-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  @media (max-width: 600px) {
    .forum-wrap { padding: 1.25rem 0.75rem 3rem; }
    .replies-wrap { margin-left: 32px; }
    .reply-compose { margin-left: 32px; }
  }
`

function avColor(namn = '') {
  return `av-c${namn.charCodeAt(0) % 8}`
}

function initials(namn = '') {
  return namn.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatTid(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const nu = new Date()
  const diff = nu - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just nu'
  if (min < 60) return `${min} min sedan`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} tim sedan`
  const dagar = Math.floor(h / 24)
  if (dagar === 1) return 'igår'
  if (dagar < 7) return `${dagar} dagar sedan`
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

// Exporteras och används av Navbar för badge-räknaren
export function räknaOlästa(inlägg) {
  const senastLäst = localStorage.getItem(OLÄST_KEY)
  if (!senastLäst) return inlägg.length
  const gräns = new Date(senastLäst)
  return inlägg.filter((p) => new Date(p.created_at) > gräns).length
}

export function markeraAllaLästa() {
  localStorage.setItem(OLÄST_KEY, new Date().toISOString())
}

export default function Forum() {
  const { användare } = useAuth()
  const location = useLocation()
  const [inlägg, setInlägg] = useState([])
  const [laddar, setLaddar] = useState(true)
  const [laddaFel, setLaddaFel] = useState(null)
  const [nyText, setNyText] = useState('')
  const [sparar, setSparar] = useState(false)
  const [publiceraFel, setPubliceraFel] = useState(null)
  const [öppnaSvar, setÖppnaSvar] = useState({})
  const [svarText, setSvarText] = useState({})
  const [spararSvar, setSpararSvar] = useState({})
  const [raderaKonfirm, setRaderaKonfirm] = useState(null)
  const [senastLäst, setSenastLäst] = useState(() => localStorage.getItem(OLÄST_KEY))
  const ärAdmin = !!localStorage.getItem('admin_secret')
  const textareaRef = useRef(null)

  // Kan radera om admin ELLER om man äger inlägget
  const kanRadera = (post_user_id) => ärAdmin || post_user_id === användare?.user_id

  if (!användare) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="forum-locked">
          <div className="forum-locked-icon">🔒</div>
          <h2>Inloggning krävs</h2>
          <p>Du måste vara inloggad för att se och delta i forumet.</p>
          <Link to="/login" className="forum-locked-btn">Logga in</Link>
        </div>
      </>
    )
  }

  useEffect(() => {
    hämtaInlägg()
    // Markera som läst när man öppnar forumet
    markeraAllaLästa()
    setSenastLäst(localStorage.getItem(OLÄST_KEY))
    // Trigga navbar-uppdatering via storage event
    window.dispatchEvent(new Event('forum-läst'))
  }, [location.pathname])

  async function hämtaInlägg() {
    setLaddar(true)
    setLaddaFel(null)
    try {
      const res = await fetch('/.netlify/functions/forum', {
        headers: { Authorization: `Bearer ${användare.token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setLaddaFel(data.error || `Serverfel (${res.status})`)
        return
      }
      setInlägg(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[Forum] Kunde inte hämta inlägg:', err)
      setLaddaFel('Kunde inte nå servern. Kontrollera att forum.js finns i Netlify/functions/')
    } finally {
      setLaddar(false)
    }
  }

  async function publicera() {
    if (!nyText.trim() || sparar) return
    setSparar(true)
    setPubliceraFel(null)
    try {
      const res = await fetch('/.netlify/functions/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
        body: JSON.stringify({ text: nyText }),
      })
      const data = await res.json()
      if (res.ok) {
        setInlägg((prev) => [data, ...prev])
        setNyText('')
        markeraAllaLästa()
      } else {
        setPubliceraFel(data.error || `Serverfel (${res.status})`)
      }
    } catch (err) {
      console.error('[Forum] Kunde inte publicera:', err)
      setPubliceraFel('Kunde inte nå servern. Försök igen.')
    } finally {
      setSparar(false)
    }
  }

  async function gilla(inlägg_id) {
    setInlägg((prev) =>
      prev.map((i) => i.id === inlägg_id && !i.gillad_av_mig
        ? { ...i, gillningar: i.gillningar + 1, gillad_av_mig: true } : i
      )
    )
    await fetch('/.netlify/functions/forum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
      body: JSON.stringify({ typ: 'gilla', inlägg_id }),
    })
  }

  async function skickaSvar(inlägg_id) {
    const text = svarText[inlägg_id]?.trim()
    if (!text || spararSvar[inlägg_id]) return
    setSpararSvar((prev) => ({ ...prev, [inlägg_id]: true }))
    try {
      const res = await fetch('/.netlify/functions/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
        body: JSON.stringify({ typ: 'svar', inlägg_id, text }),
      })
      const data = await res.json()
      if (res.ok) {
        setInlägg((prev) =>
          prev.map((i) => i.id === inlägg_id ? { ...i, svar: [...i.svar, data] } : i)
        )
        setSvarText((prev) => ({ ...prev, [inlägg_id]: '' }))
        setÖppnaSvar((prev) => ({ ...prev, [inlägg_id]: false }))
        markeraAllaLästa()
      }
    } catch (err) {
      console.error('[Forum] Kunde inte skicka svar:', err)
    } finally {
      setSpararSvar((prev) => ({ ...prev, [inlägg_id]: false }))
    }
  }

  async function raderaPost(id, typ) {
    // Admin använder admin_secret, ägare använder sitt JWT
    const adminSecret = localStorage.getItem('admin_secret')
    const authToken = adminSecret || användare.token
    try {
      const res = await fetch('/.netlify/functions/forum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ id, typ }),
      })
      if (res.ok) {
        if (typ === 'inlägg') {
          setInlägg((prev) => prev.filter((i) => i.id !== id))
        } else {
          setInlägg((prev) =>
            prev.map((i) => ({ ...i, svar: i.svar.filter((s) => s.id !== id) }))
          )
        }
      }
    } catch (err) {
      console.error('[Forum] Kunde inte radera:', err)
    } finally {
      setRaderaKonfirm(null)
    }
  }

  function ärNy(created_at) {
    if (!senastLäst) return false
    // Om inlägget skapades INNAN vi öppnade sidan (dvs senastLäst sattes precis), visa inte NY
    return false
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="forum-wrap">
        <p className="forum-eyebrow">VM-tipsen 2026</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#0a1628', letterSpacing: '0.03em', margin: 0 }}>
            Forum 💬
          </h1>
          {ärAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(200,16,46,0.07)',
                border: '1px solid rgba(200,16,46,0.25)',
                borderRadius: 100,
                padding: '4px 12px 4px 8px',
              }}>
                <span style={{ fontSize: 13 }}>⚙️</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#C8102E',
                }}>Adminläge</span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_secret')
                  window.location.reload()
                }}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'none', border: '1px solid #ddd',
                  borderRadius: 100, padding: '4px 10px',
                  color: '#aaa', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#C8102E'; e.target.style.color = '#C8102E' }}
                onMouseLeave={e => { e.target.style.borderColor = '#ddd'; e.target.style.color = '#aaa' }}
                title="Avsluta adminläge"
              >
                Avsluta
              </button>
            </div>
          )}
        </div>

        <div className="compose-box">
          <textarea
            ref={textareaRef}
            className="compose-ta"
            placeholder="Dela en tanke, skryt om ditt tips eller utmana en vän..."
            value={nyText}
            onChange={(e) => setNyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) publicera() }}
          />
          <div className="compose-row">
            <div className="compose-who">
              <div className={`av av-sm ${avColor(användare.namn)}`}>{initials(användare.namn)}</div>
              <span>{användare.namn}</span>
            </div>
            <button className="pub-btn" onClick={publicera} disabled={!nyText.trim() || sparar}>
              {sparar ? 'Publicerar...' : 'Publicera'}
            </button>
          </div>
          {publiceraFel && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
              fontSize: 13, color: '#8a1020', fontFamily: "'Barlow', sans-serif",
            }}>
              ⚠️ {publiceraFel}
            </div>
          )}
        </div>

        {laddar ? (
          <div className="forum-loading">Laddar inlägg...</div>
        ) : laddaFel ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            background: '#fff', borderRadius: 14,
            border: '1px solid rgba(200,16,46,0.15)',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</p>
            <p style={{ fontSize: 14, color: '#8a1020', fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
              {laddaFel}
            </p>
            <button
              onClick={hämtaInlägg}
              style={{
                marginTop: '1rem', fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                background: '#0a1628', color: '#F0D060', border: 'none',
                borderRadius: 8, padding: '8px 18px', cursor: 'pointer',
              }}
            >
              Försök igen
            </button>
          </div>
        ) : inlägg.length === 0 ? (
          <div className="forum-empty">
            <p>💬</p>
            <p>Inga inlägg än — var den första att skriva något!</p>
          </div>
        ) : (
          inlägg.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-head">
                <div className={`av ${avColor(post.namn)}`}>{initials(post.namn)}</div>
                <div>
                  <div className="post-name">{post.namn}</div>
                  <div className="post-time">{formatTid(post.created_at)}</div>
                </div>
              </div>

              <div className="post-body">{post.text}</div>

              <div className="post-foot">
                <button
                  className={`act-btn ${post.gillad_av_mig ? 'liked' : ''}`}
                  onClick={() => !post.gillad_av_mig && gilla(post.id)}
                  title={post.gillad_av_mig ? 'Du har gillat detta' : 'Gilla'}
                >
                  👍 {post.gillningar > 0 && post.gillningar}
                </button>
                <button className="act-btn" onClick={() => setÖppnaSvar((p) => ({ ...p, [post.id]: !p[post.id] }))}>
                  💬 {post.svar.length > 0 ? `${post.svar.length} svar` : 'Svara'}
                </button>
                {kanRadera(post.user_id) && (
                  <button
                    className="delete-btn"
                    title={ärAdmin ? 'Radera inlägg (admin)' : 'Radera mitt inlägg'}
                    onClick={() => setRaderaKonfirm({ id: post.id, typ: 'inlägg' })}
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Bekräftelse för radering av inlägg */}
              {raderaKonfirm?.id === post.id && raderaKonfirm?.typ === 'inlägg' && (
                <div className="delete-confirm">
                  <span>Radera detta inlägg och alla svar?</span>
                  <button className="delete-confirm-nej" onClick={() => setRaderaKonfirm(null)}>Avbryt</button>
                  <button className="delete-confirm-ja" onClick={() => raderaPost(post.id, 'inlägg')}>Radera</button>
                </div>
              )}

              {/* Befintliga svar */}
              {post.svar.length > 0 && (
                <div className="replies-wrap">
                  {post.svar.map((svar) => (
                    <div key={svar.id} className="reply-card">
                      <div className="reply-head">
                        <div className={`av av-sm ${avColor(svar.namn)}`}>{initials(svar.namn)}</div>
                        <span className="reply-name">{svar.namn}</span>
                        <span className="reply-time">{formatTid(svar.created_at)}</span>
                        {kanRadera(svar.user_id) && (
                          <button
                            className="reply-delete-btn"
                            title={ärAdmin ? 'Radera svar (admin)' : 'Radera mitt svar'}
                            onClick={() => setRaderaKonfirm({ id: svar.id, typ: 'svar' })}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div className="reply-text">{svar.text}</div>
                      {raderaKonfirm?.id === svar.id && raderaKonfirm?.typ === 'svar' && (
                        <div className="delete-confirm" style={{ marginTop: 8 }}>
                          <span>Radera detta svar?</span>
                          <button className="delete-confirm-nej" onClick={() => setRaderaKonfirm(null)}>Avbryt</button>
                          <button className="delete-confirm-ja" onClick={() => raderaPost(svar.id, 'svar')}>Radera</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Svara-fält */}
              {öppnaSvar[post.id] && (
                <div className="reply-compose">
                  <textarea
                    className="reply-ta"
                    placeholder="Skriv ett svar..."
                    value={svarText[post.id] || ''}
                    onChange={(e) => setSvarText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) skickaSvar(post.id) }}
                    autoFocus
                  />
                  <button
                    className="reply-send-btn"
                    onClick={() => skickaSvar(post.id)}
                    disabled={!svarText[post.id]?.trim() || spararSvar[post.id]}
                  >
                    {spararSvar[post.id] ? '...' : 'Skicka'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}