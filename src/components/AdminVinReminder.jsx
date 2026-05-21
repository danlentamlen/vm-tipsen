// src/components/AdminVinPåminnelse.jsx
//
// Drop-in card for the /admin page.
// Shows participants who have signed up but NOT yet registered a wine bottle,
// with per-person and bulk-send reminder email controls.
//
// Usage in Admin.jsx:
//   import AdminVinReminder from '../components/AdminVinReminder'
//   ...
//   <AdminVinReminder adminSecret={adminSecret} visaToast={visaToast} />

import { useState, useEffect, useCallback } from 'react'

const STYLES = `
  /* ── Påminnelse-card ──────────────────────────────── */
  .påm-card {
    background: #fff;
    border: 1px solid rgba(0,0,0,.07);
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
  }
  .påm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: .75rem;
    margin-bottom: 1rem;
  }
  .påm-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #0a1628; margin: 0;
  }
  .påm-badge {
    display: inline-flex; align-items: center;
    background: rgba(200,16,46,.08);
    color: #C8102E;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .72rem; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 100px;
    border: 1px solid rgba(200,16,46,.18);
  }
  .påm-badge.ok {
    background: rgba(26,107,53,.08);
    color: #1a6b35;
    border-color: rgba(26,107,53,.2);
  }
  .påm-send-all {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .78rem; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    padding: 8px 18px;
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
    border: none; border-radius: 8px;
    cursor: pointer; transition: opacity .15s;
    white-space: nowrap;
  }
  .påm-send-all:hover:not(:disabled) { opacity: .85; }
  .påm-send-all:disabled { opacity: .35; cursor: not-allowed; }

  /* Filter row */
  .påm-filter-row {
    display: flex; align-items: center; gap: .625rem;
    margin-bottom: .875rem; flex-wrap: wrap;
  }
  .påm-search {
    flex: 1; min-width: 160px;
    font-family: 'Barlow', sans-serif; font-size: .88rem;
    padding: 8px 12px;
    border: 1.5px solid rgba(0,0,0,.1); border-radius: 8px;
    outline: none; background: #fafaf8; color: #0a1628;
    transition: border-color .15s;
  }
  .påm-search:focus { border-color: #C5A028; }

  /* Participant list */
  .påm-list {
    display: flex; flex-direction: column; gap: .5rem;
  }
  .påm-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: .75rem; padding: .75rem 1rem;
    background: #fafaf8;
    border: 1px solid rgba(0,0,0,.06); border-radius: 10px;
    flex-wrap: wrap;
    transition: background .12s, border-color .12s;
  }
  .påm-row:hover { background: #f5f3ee; border-color: rgba(197,160,40,.25); }
  .påm-row-left {
    display: flex; align-items: center; gap: .625rem;
    min-width: 0;
  }
  .påm-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    color: #F0D060;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .85rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .påm-name {
    font-family: 'Barlow', sans-serif;
    font-size: .9rem; font-weight: 600; color: #0a1628;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .påm-email {
    font-family: 'Barlow', sans-serif;
    font-size: .72rem; color: #aaa;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .påm-send-one {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .7rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    padding: 6px 13px;
    background: rgba(197,160,40,.1);
    color: #7a5c10;
    border: 1px solid rgba(197,160,40,.3);
    border-radius: 7px; cursor: pointer;
    transition: all .15s; white-space: nowrap; flex-shrink: 0;
  }
  .påm-send-one:hover:not(:disabled) { background: rgba(197,160,40,.2); }
  .påm-send-one.sent {
    background: rgba(26,107,53,.08);
    color: #1a6b35;
    border-color: rgba(26,107,53,.2);
    cursor: default;
  }
  .påm-send-one:disabled { opacity: .4; cursor: not-allowed; }

  /* Empty / loading states */
  .påm-empty {
    text-align: center; padding: 2rem 1rem;
    font-family: 'Barlow', sans-serif; font-size: .88rem; color: #aaa;
  }
  .påm-empty-icon { font-size: 2rem; margin-bottom: .5rem; }
  .påm-loader {
    display: flex; align-items: center; gap: .5rem;
    font-family: 'Barlow', sans-serif; font-size: .85rem; color: #aaa;
    padding: .75rem 0;
  }
  .påm-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(0,0,0,.1);
    border-top-color: #C8102E;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Confirm overlay for bulk send */
  .påm-confirm {
    background: rgba(200,16,46,.04);
    border: 1px solid rgba(200,16,46,.18);
    border-radius: 10px; padding: .875rem 1rem;
    margin-bottom: .875rem;
    font-family: 'Barlow', sans-serif; font-size: .85rem; color: #333;
    display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  }
  .påm-confirm-text { flex: 1; line-height: 1.5; }
  .påm-confirm-btns { display: flex; gap: .5rem; flex-shrink: 0; }
  .påm-confirm-yes {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    padding: 7px 16px;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; border: none; border-radius: 7px; cursor: pointer;
  }
  .påm-confirm-no {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    padding: 7px 16px;
    background: #f0ede6; color: #555;
    border: none; border-radius: 7px; cursor: pointer;
  }

  @media (max-width: 480px) {
    .påm-email { display: none; }
    .påm-row { gap: .5rem; }
  }
`

export default function AdminVinReminder({ adminSecret, visaToast }) {
  const [laddar, setLaddar]         = useState(false)
  const [deltagare, setDeltagare]   = useState(null) // null = not yet loaded
  const [sök, setSök]               = useState('')
  const [sänder, setSänder]         = useState(new Set()) // user_ids currently sending
  const [skickade, setSkickade]     = useState(new Set()) // user_ids already sent this session
  const [bekräfta, setBekräfta]     = useState(false) // bulk confirm visible
  const [sänderAlla, setSänderAlla] = useState(false)

  // ── Load participants without wine ─────────────────────────────────────────
  const hämta = useCallback(async () => {
    setLaddar(true)
    try {
      const res  = await fetch('/.netlify/functions/admin-paminnelse', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      })
      if (res.status === 401) { visaToast('❌ Inte behörig'); return }
      const data = await res.json()
      setDeltagare(Array.isArray(data.utan_vin) ? data.utan_vin : [])
    } catch (err) {
      console.error('[AdminVinReminder] hämta fel:', err)
      visaToast('❌ Kunde inte hämta deltagarlistan')
    } finally {
      setLaddar(false)
    }
  }, [adminSecret, visaToast])

  // Load on mount
  useEffect(() => { hämta() }, [hämta])

  // ── Send reminder to one person ────────────────────────────────────────────
  async function skickaEn(user_id) {
    setSänder(prev => new Set(prev).add(user_id))
    try {
      const res  = await fetch('/.netlify/functions/admin-paminnelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ user_ids: [user_id] }),
      })
      const data = await res.json()
      if (res.ok) {
        setSkickade(prev => new Set(prev).add(user_id))
        visaToast(`📧 Påminnelse skickad!`)
      } else {
        visaToast(`❌ ${data.error || 'Kunde inte skicka mail'}`)
      }
    } catch {
      visaToast('❌ Serverfel — försök igen')
    } finally {
      setSänder(prev => { const s = new Set(prev); s.delete(user_id); return s })
    }
  }

  // ── Send reminder to ALL ───────────────────────────────────────────────────
  async function skickaAlla() {
    setBekräfta(false)
    setSänderAlla(true)
    try {
      const res  = await fetch('/.netlify/functions/admin-paminnelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({ all: true }),
      })
      const data = await res.json()
      if (res.ok) {
        // Mark all visible as sent
        setSkickade(new Set(deltagare.map(d => d.user_id)))
        visaToast(`📧 ${data.message}${data.misslyckade > 0 ? ` (${data.misslyckade} misslyckades)` : ''}`)
      } else {
        visaToast(`❌ ${data.error || 'Något gick fel'}`)
      }
    } catch {
      visaToast('❌ Serverfel — försök igen')
    } finally {
      setSänderAlla(false)
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const synliga = (deltagare ?? []).filter(p =>
    !sök || p.namn.toLowerCase().includes(sök.toLowerCase()) ||
    p.email?.toLowerCase().includes(sök.toLowerCase())
  )

  const osändaBadgeAntal = deltagare?.filter(p => !skickade.has(p.user_id)).length ?? 0

  return (
    <>
      <style>{STYLES}</style>

      <div className="påm-card">
        {/* Header */}
        <div className="påm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
            <p className="påm-title">🍷 Vinflaska saknas</p>
            {deltagare !== null && (
              <span className={`påm-badge ${osändaBadgeAntal === 0 ? 'ok' : ''}`}>
                {osändaBadgeAntal === 0
                  ? '✅ Alla klara'
                  : `${osändaBadgeAntal} saknar vin`}
              </span>
            )}
          </div>

          {/* Bulk-send button — only show when there's someone to remind */}
          {osändaBadgeAntal > 0 && (
            <button
              className="påm-send-all"
              onClick={() => setBekräfta(true)}
              disabled={sänderAlla || laddar}
            >
              {sänderAlla ? '⏳ Skickar...' : `📧 Påminn alla (${osändaBadgeAntal})`}
            </button>
          )}
        </div>

        {/* Bulk confirm */}
        {bekräfta && (
          <div className="påm-confirm">
            <p className="påm-confirm-text">
              Skicka påminnelse till <strong>{osändaBadgeAntal} deltagare</strong> som saknar vinregistrering?
            </p>
            <div className="påm-confirm-btns">
              <button className="påm-confirm-yes" onClick={skickaAlla}>Ja, skicka</button>
              <button className="påm-confirm-no"  onClick={() => setBekräfta(false)}>Avbryt</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {laddar && (
          <div className="påm-loader">
            <div className="påm-spinner" />
            Hämtar deltagare...
          </div>
        )}

        {/* Empty state */}
        {!laddar && deltagare !== null && deltagare.length === 0 && (
          <div className="påm-empty">
            <div className="påm-empty-icon">🎉</div>
            Alla deltagare har registrerat sin vinflaska!
          </div>
        )}

        {/* List */}
        {!laddar && deltagare !== null && deltagare.length > 0 && (
          <>
            {/* Search / filter */}
            {deltagare.length > 4 && (
              <div className="påm-filter-row">
                <input
                  className="påm-search"
                  placeholder="Sök deltagare..."
                  value={sök}
                  onChange={e => setSök(e.target.value)}
                />
              </div>
            )}

            <div className="påm-list">
              {synliga.map(p => {
                const initials = p.namn.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                const harSkickats = skickade.has(p.user_id)
                const håller      = sänder.has(p.user_id)

                return (
                  <div className="påm-row" key={p.user_id}>
                    <div className="påm-row-left">
                      <div className="påm-avatar">{initials}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="påm-name">{p.namn}</div>
                        <div className="påm-email">{p.email}</div>
                      </div>
                    </div>

                    <button
                      className={`påm-send-one${harSkickats ? ' sent' : ''}`}
                      onClick={() => !harSkickats && skickaEn(p.user_id)}
                      disabled={håller || sänderAlla}
                    >
                      {håller      ? '⏳ Skickar...'
                       : harSkickats ? '✅ Skickat'
                       : '📧 Skicka påminnelse'}
                    </button>
                  </div>
                )
              })}

              {synliga.length === 0 && sök && (
                <div className="påm-empty">Inga träffar för "{sök}".</div>
              )}
            </div>

            {/* Summary footer */}
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '.72rem', color: '#bbb',
              margin: '.875rem 0 0', textAlign: 'right',
            }}>
              {deltagare.length} deltagare saknar vinregistrering
              {skickade.size > 0 && ` · ${skickade.size} påminnelse${skickade.size !== 1 ? 'r' : ''} skickad${skickade.size !== 1 ? 'e' : ''} denna session`}
            </p>
          </>
        )}
      </div>
    </>
  )
}