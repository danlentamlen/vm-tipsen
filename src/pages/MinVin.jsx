import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MIN_PRIS = 180
const MAX_PRIS = 220

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .mv-wrap { max-width:520px; margin:0 auto; padding:2rem 1rem 4rem; }
  .mv-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .mv-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.5rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:1.5rem; }

  /* Status banner */
  .mv-status { display:flex; align-items:flex-start; gap:12px; border-radius:10px; padding:1rem 1.1rem; margin-bottom:1.25rem; font-family:'Barlow',sans-serif; font-size:.88rem; line-height:1.5; }
  .mv-status.paid    { background:rgba(10,22,40,.05);   border:1px solid rgba(10,22,40,.12); }
  .mv-status.unpaid  { background:rgba(197,160,40,.08); border:1px solid rgba(197,160,40,.25); }
  .mv-status.missing { background:rgba(200,16,46,.06);  border:1px solid rgba(200,16,46,.15); }
  .mv-status-icon { font-size:1.25rem; flex-shrink:0; margin-top:1px; }
  .mv-status-title { font-family:'Barlow Condensed',sans-serif; font-size:.85rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:2px; }
  .mv-status.paid .mv-status-title    { color:#0a1628; }
  .mv-status.unpaid .mv-status-title  { color:#7a5c10; }
  .mv-status.missing .mv-status-title { color:#8a1020; }
  .mv-status-text { color:#666; font-size:.83rem; }

  /* Wine display card (paid / read-only) */
  .mv-wine-display {
    background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px;
    overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.05); margin-bottom:1.25rem;
  }
  .mv-wine-display-img {
    width:100%; height:160px; background:#f4f2ee;
    display:flex; align-items:center; justify-content:center; overflow:hidden;
  }
  .mv-wine-display-img img { max-height:100%; max-width:100%; object-fit:contain; }
  .mv-wine-display-img .mv-wine-emoji { font-size:4rem; opacity:.4; }
  .mv-wine-display-body { padding:1.25rem 1.5rem; }
  .mv-wine-name { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; color:#0a1628; letter-spacing:.02em; margin-bottom:.25rem; }
  .mv-wine-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .mv-wine-price { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:#C8102E; }
  .mv-wine-link { font-family:'Barlow',sans-serif; font-size:.82rem; color:#C5A028; text-decoration:none; }
  .mv-wine-link:hover { text-decoration:underline; }

  /* Swish confirm card */
  .mv-confirm { background:linear-gradient(135deg,#0a1628,#1a2e4a); border-radius:12px; padding:1.5rem; margin-bottom:1.25rem; }
  .mv-confirm-title { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.06em; color:#F0D060; margin-bottom:.875rem; }
  .mv-confirm-row { display:flex; justify-content:space-between; align-items:center; padding:.35rem 0; font-family:'Barlow',sans-serif; font-size:.85rem; border-bottom:1px solid rgba(255,255,255,.06); }
  .mv-confirm-row:last-of-type { border-bottom:none; }
  .mv-confirm-label { color:rgba(255,255,255,.5); }
  .mv-confirm-value { color:#fff; font-weight:500; }
  .mv-confirm-value.gold { color:#F0D060; }
  .mv-confirm-total { display:flex; justify-content:space-between; align-items:baseline; margin-top:.875rem; padding-top:.875rem; border-top:1px solid rgba(197,160,40,.3); }
  .mv-confirm-total-label { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.4); }
  .mv-confirm-total-value { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; color:#F0D060; }
  .mv-swish-box { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:1rem; text-align:center; margin-top:.875rem; }
  .mv-swish-lbl { font-family:'Barlow Condensed',sans-serif; font-size:.68rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:rgba(255,255,255,.35); margin-bottom:4px; }
  .mv-swish-num { font-family:'Barlow Condensed',sans-serif; font-size:1.6rem; font-weight:700; color:#fff; letter-spacing:.08em; }
  .mv-swish-hint { font-family:'Barlow',sans-serif; font-size:.75rem; color:rgba(255,255,255,.4); margin-top:.5rem; line-height:1.5; }
  .mv-swish-hint strong { color:rgba(255,255,255,.7); }

  /* Form */
  .mv-form-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:1.5rem; box-shadow:0 2px 12px rgba(0,0,0,.05); }
  .mv-form-title { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0a1628; margin-bottom:1.1rem; }
  .mv-field { margin-bottom:1rem; }
  .mv-label { display:block; font-family:'Barlow',sans-serif; font-size:.82rem; font-weight:600; color:#0a1628; margin-bottom:5px; }
  .mv-input { width:100%; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:.9rem; border:1.5px solid rgba(0,0,0,.12); border-radius:8px; background:#fff; color:#0a1628; outline:none; transition:border-color .15s; box-sizing:border-box; }
  .mv-input:focus { border-color:#C5A028; }
  .mv-input.error { border-color:#C8102E; }
  .mv-hint { font-family:'Barlow',sans-serif; font-size:.73rem; color:#aaa; margin-top:4px; line-height:1.4; }
  .mv-hint.warn { color:#C8102E; }

  .mv-alert { display:flex; align-items:flex-start; gap:8px; border-radius:8px; padding:.75rem 1rem; font-family:'Barlow',sans-serif; font-size:.85rem; line-height:1.5; margin-bottom:1rem; }
  .mv-alert.error { background:rgba(200,16,46,.06); border:1px solid rgba(200,16,46,.2); color:#8a1020; }

  .mv-submit { width:100%; padding:13px; font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:linear-gradient(135deg,#0a1628,#1a2e4a); color:#F0D060; border:none; border-radius:8px; cursor:pointer; transition:opacity .2s; margin-top:.5rem; }
  .mv-submit:hover:not(:disabled) { opacity:.88; }
  .mv-submit:disabled { opacity:.4; cursor:not-allowed; }

  .mv-next { display:block; text-align:center; margin-top:1.5rem; font-family:'Barlow Condensed',sans-serif; font-size:.9rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#C8102E; text-decoration:none; }
  .mv-next:hover { text-decoration:underline; }
`

export default function MinVin() {
  const { användare } = useAuth()
  const navigate = useNavigate()

  const [mittVin, setMittVin]         = useState(null)   // data från sheets
  const [form, setForm]               = useState({ vin_namn: '', vin_url: '', vin_pris: '' })
  const [swishNummer, setSwishNummer] = useState(null)
  const [laddar, setLaddar]           = useState(true)
  const [sparar, setSparar]           = useState(false)
  const [visBekräftelse, setVisBekräftelse] = useState(false)
  const [fel, setFel]                 = useState(null)

  useEffect(() => {
    if (!användare) { navigate('/login'); return }
    hämtaAllt()
  }, [användare])

  async function hämtaAllt() {
    try {
      const [vinerRes, inställRes] = await Promise.all([
        fetch('/.netlify/functions/viner-hamta'),
        fetch('/.netlify/functions/settings').catch(() => ({ json: () => ({}) })),
      ])

      const vinerData = await vinerRes.json()
      const inställData = await inställRes.json?.() ?? {}

      setSwishNummer(inställData.swish_nummer || null)

      // Hitta användarens vin — matcha på user_id
      if (Array.isArray(vinerData)) {
        const mitt = vinerData.find((v) => v.user_id === användare.user_id)
        if (mitt) {
          setMittVin(mitt)
          setForm({
            vin_namn: mitt.vin_namn || '',
            vin_url:  mitt.vin_url  || '',
            vin_pris: mitt.vin_pris || '',
          })
        }
      }
    } catch (err) {
      console.error('hämtaAllt fel:', err)
    } finally {
      setLaddar(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (fel) setFel(null)
  }

  const pris        = Number(form.vin_pris)
  const prisOk      = !form.vin_pris || (pris >= MIN_PRIS && pris <= MAX_PRIS)
  const prisUtanför = form.vin_pris && !prisOk
  const totalPris   = prisOk && form.vin_pris ? pris + 10 : null

  const betalt       = mittVin?.betalt === 'betalt'
  const harVin       = !!mittVin?.vin_namn
  const kanRedigera  = !betalt

  const swishMeddelande = användare?.namn
    ? 'VM-Tips-' + användare.namn.replace(/\s+/g, '-')
    : 'VM-Tips-Ditt-Namn'

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)
    if (prisUtanför) { setFel(`Priset måste vara mellan ${MIN_PRIS} och ${MAX_PRIS} kr.`); return }
    setSparar(true)
    try {
      const res = await fetch('/.netlify/functions/viner-spara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${användare.token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setFel(data.error || 'Något gick fel')
      } else {
        // Uppdatera lokalt state direkt utan ny nätverksanrop
        setMittVin((prev) => ({ ...(prev || {}), ...form, user_id: användare.user_id, betalt: 'ej_betalt' }))
        setVisBekräftelse(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch {
      setFel('Något gick fel, försök igen')
    } finally {
      setSparar(false)
    }
  }

  if (laddar) {
    return <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#888' }}>Laddar...</div>
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="mv-wrap">
        <p className="mv-eyebrow">VM-tipsen 2026</p>
        <h1 className="mv-title">Min vinflaska</h1>

        {/* ── Statusbanner ── */}
        {betalt ? (
          <div className="mv-status paid">
            <span className="mv-status-icon">✅</span>
            <div>
              <p className="mv-status-title">Betalning bekräftad</p>
              <p className="mv-status-text">Admin har bekräftat din betalning. Din flaska är med i potten och kan inte längre ändras.</p>
            </div>
          </div>
        ) : harVin ? (
          <div className="mv-status unpaid">
            <span className="mv-status-icon">⏳</span>
            <div>
              <p className="mv-status-title">Väntar på betalning</p>
              <p className="mv-status-text">Vinet är sparat. Swisha insatsen till admin för att bekräfta din plats i potten.</p>
            </div>
          </div>
        ) : (
          <div className="mv-status missing">
            <span className="mv-status-icon">🍷</span>
            <div>
              <p className="mv-status-title">Ingen vinflaska vald</p>
              <p className="mv-status-text">Välj din flaska nedan. Den måste kosta mellan 180–220 kr.</p>
            </div>
          </div>
        )}

        {/* ── Visat sparad flaska ── alltid synlig när vin är registrerat ── */}
        {harVin && (
          <div className="mv-wine-display">
            {mittVin.bild_url ? (
              <div className="mv-wine-display-img"><img src={mittVin.bild_url} alt={mittVin.vin_namn} /></div>
            ) : (
              <div className="mv-wine-display-img"><span className="mv-wine-emoji">🍷</span></div>
            )}
            <div className="mv-wine-display-body">
              <p className="mv-wine-name">{mittVin.vin_namn}</p>
              <div className="mv-wine-meta">
                {mittVin.vin_pris && <span className="mv-wine-price">{mittVin.vin_pris} kr</span>}
                {mittVin.vin_url && (
                  <a href={mittVin.vin_url} target="_blank" rel="noopener noreferrer" className="mv-wine-link">
                    → Systembolaget
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Swish-instruktion — visas alltid när vin är sparat men ej betalt ── */}
        {harVin && !betalt && (
          <div className="mv-confirm">
            <p className="mv-confirm-title">💸 Swisha din insats</p>
            <div className="mv-confirm-row">
              <span className="mv-confirm-label">Vinflaska</span>
              <span className="mv-confirm-value">{mittVin?.vin_namn || form.vin_namn}</span>
            </div>
            <div className="mv-confirm-row">
              <span className="mv-confirm-label">Vinpris</span>
              <span className="mv-confirm-value gold">{mittVin?.vin_pris || form.vin_pris} kr</span>
            </div>
            <div className="mv-confirm-row">
              <span className="mv-confirm-label">Adminavgift</span>
              <span className="mv-confirm-value">10 kr</span>
            </div>
            <div className="mv-confirm-total">
              <span className="mv-confirm-total-label">Swisha totalt</span>
              <span className="mv-confirm-total-value">
                {mittVin?.vin_pris ? Number(mittVin.vin_pris) + 10 : totalPris ?? '—'} kr
              </span>
            </div>
            {swishNummer && (
              <div className="mv-swish-box">
                <p className="mv-swish-lbl">Swish-nummer</p>
                <p className="mv-swish-num">{swishNummer}</p>
                <p className="mv-swish-hint">Märk betalningen: <strong>{swishMeddelande}</strong></p>
              </div>
            )}
          </div>
        )}

        {/* ── Formulär (visas om man kan redigera) ── */}
        {kanRedigera && (
          <div className="mv-form-card">
            <p className="mv-form-title">{harVin ? 'Uppdatera din vinflaska' : 'Välj din vinflaska'}</p>
            {fel && <div className="mv-alert error"><span>⚠️</span><span>{fel}</span></div>}
            <form onSubmit={handleSubmit}>
              <div className="mv-field">
                <label className="mv-label">Vinets namn *</label>
                <input type="text" name="vin_namn" value={form.vin_namn} onChange={handleChange} required placeholder="t.ex. Château Margaux 2019" className="mv-input" />
              </div>
              <div className="mv-field">
                <label className="mv-label">Länk hos Systembolaget *</label>
                <input type="url" name="vin_url" value={form.vin_url} onChange={handleChange} required placeholder="https://www.systembolaget.se/produkt/..." className="mv-input" />
                <p className="mv-hint">Kopiera länken direkt från systembolaget.se</p>
              </div>
              <div className="mv-field">
                <label className="mv-label">Pris (kr) *</label>
                <input type="number" name="vin_pris" value={form.vin_pris} onChange={handleChange} required placeholder="t.ex. 199" min={MIN_PRIS} max={MAX_PRIS} className={`mv-input ${prisUtanför ? 'error' : ''}`} />
                {prisUtanför
                  ? <p className="mv-hint warn">Priset måste vara mellan {MIN_PRIS} och {MAX_PRIS} kr.</p>
                  : <p className="mv-hint">Välj en flaska mellan {MIN_PRIS}–{MAX_PRIS} kr.</p>
                }
              </div>
              <button type="submit" disabled={sparar || prisUtanför} className="mv-submit">
                {sparar ? 'Sparar...' : harVin ? 'Uppdatera vinflaska' : 'Spara vinflaska 🍷'}
              </button>
            </form>
          </div>
        )}

        {/* Nästa steg */}
        {harVin && (
          <Link to="/matches" className="mv-next">→ Börja tippa matcher</Link>
        )}
      </div>
    </>
  )
}