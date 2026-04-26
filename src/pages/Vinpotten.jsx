import { useState, useEffect } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .vp-wrap {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }

  .vp-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem;
  }
  .vp-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1;
    margin-bottom: 0.5rem;
  }
  .vp-subtitle {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; color: #888; margin-bottom: 1.75rem;
  }

  /* Hero totals banner */
  .vp-hero {
    background: linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%);
    border-radius: 12px;
    padding: 1.5rem 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  .vp-hero-left {}
  .vp-hero-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.2em;
    text-transform: uppercase; color: rgba(255,255,255,0.4);
    margin-bottom: 0.2rem;
  }
  .vp-hero-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 2.4rem; font-weight: 700; color: #F0D060;
    line-height: 1;
  }
  .vp-hero-unit {
    font-size: 1rem; color: rgba(255,255,255,0.4); margin-left: 4px;
  }
  .vp-hero-stats {
    display: flex; gap: 1.5rem;
  }
  .vp-stat { text-align: center; }
  .vp-stat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #fff; line-height: 1;
  }
  .vp-stat-lbl {
    font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.35);
    display: block; margin-top: 2px;
  }

  /* Wine cards */
  .vp-list {
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .vp-card {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    transition: box-shadow 0.15s, border-color 0.15s;
    text-decoration: none;
    display: block;
    color: inherit;
  }
  .vp-card:hover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.09);
    border-color: rgba(197,160,40,0.4);
  }
  .vp-card-inner {
    display: flex; align-items: stretch; gap: 0;
  }

  /* Image panel */
  .vp-img-panel {
    width: 80px; flex-shrink: 0;
    background: #f8f7f4;
    display: flex; align-items: center; justify-content: center;
    border-right: 1px solid rgba(0,0,0,0.06);
    padding: 1rem 0.75rem;
  }
  .vp-img-panel img {
    width: 100%; max-height: 90px; object-fit: contain;
  }
  .vp-img-emoji { font-size: 2rem; opacity: 0.5; }

  /* Content */
  .vp-card-body {
    flex: 1; min-width: 0;
    padding: 1rem 1.1rem;
    display: flex; flex-direction: column; justify-content: center; gap: 0.35rem;
  }
  .vp-card-top {
    display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap;
  }
  .vp-wine-name {
    font-family: 'Barlow', sans-serif;
    font-size: 0.95rem; font-weight: 500; color: #0a1628;
    flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .vp-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 2px 8px; border-radius: 4px;
    white-space: nowrap; flex-shrink: 0;
  }
  .vp-badge.multi {
    background: rgba(10,22,40,0.08); color: #0a1628;
  }
  .vp-badge.paid {
    background: rgba(197,160,40,0.12); color: #7a5c10;
    border: 1px solid rgba(197,160,40,0.3);
  }

  .vp-wine-meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .vp-wine-price {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.82rem; font-weight: 600; color: #C8102E;
  }
  .vp-wine-owner {
    font-family: 'Barlow', sans-serif;
    font-size: 0.78rem; color: #aaa;
  }

  /* Arrow */
  .vp-card-arrow {
    display: flex; align-items: center;
    padding: 0 1rem 0 0;
    color: #ddd; font-size: 0.8rem; flex-shrink: 0;
  }

  /* Empty */
  .vp-empty {
    text-align: center; padding: 4rem 1rem;
  }
  .vp-empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .vp-empty-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 700; color: #0a1628; margin-bottom: 0.4rem;
  }
  .vp-empty-text {
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem; color: #aaa;
  }

  @media (max-width: 480px) {
    .vp-hero { padding: 1.25rem; }
    .vp-hero-value { font-size: 1.8rem; }
    .vp-hero-stats { gap: 1rem; }
    .vp-img-panel { width: 64px; padding: 0.75rem 0.5rem; }
  }
`

export default function Vinpotten() {
  const [viner, setViner] = useState([])
  const [laddar, setLaddar] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/viner-hamta')
      .then((r) => r.json())
      .then((data) => {
        setViner(Array.isArray(data) ? data.filter((v) => v.vin_namn) : [])
      })
      .catch(() => {})
      .finally(() => setLaddar(false))
  }, [])

  // Group by wine name, keeping first entry's data
  const grupperade = Object.values(
    viner.reduce((acc, v) => {
      // Gruppera på URL — unik identifierare, inte på namn
      const nyckel = v.vin_url?.trim().toLowerCase() || v.vin_namn
      if (!acc[nyckel]) {
        acc[nyckel] = { ...v, antal: 1, ägare: [v.namn].filter(Boolean) }
      } else {
        acc[nyckel].antal += 1
        if (v.namn) acc[nyckel].ägare.push(v.namn)
        if (!acc[nyckel].vin_namn && v.vin_namn) acc[nyckel].vin_namn = v.vin_namn
        if (!acc[nyckel].vin_pris && v.vin_pris) acc[nyckel].vin_pris = v.vin_pris
        if (!acc[nyckel].bild_url && v.bild_url) acc[nyckel].bild_url = v.bild_url
      }
      return acc
    }, {})
  ).sort((a, b) => b.antal - a.antal)

  const totalPris = viner.reduce((sum, v) => sum + (Number(v.vin_pris) || 0), 0)
  const totalFlaskor = viner.length

  if (laddar) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
        Laddar vinpotten...
      </div>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="vp-wrap">

        <p className="vp-eyebrow">VM-tipsen 2026</p>
        <h2 className="vp-title">Vinpotten</h2>
        <p className="vp-subtitle">
          {totalFlaskor > 0
            ? 'Den med flest poäng efter VM-finalen tar hem allt.'
            : 'Här samlas alla deltagarnas vinflaskor.'}
        </p>

        {/* Hero totals */}
        {totalFlaskor > 0 && (
          <div className="vp-hero">
            <div className="vp-hero-left">
              <div className="vp-hero-label">Pottens värde</div>
              {totalPris > 0 ? (
                <div className="vp-hero-value">
                  {totalPris.toLocaleString('sv-SE')}
                  <span className="vp-hero-unit">kr</span>
                </div>
              ) : (
                <div className="vp-hero-value" style={{ fontSize: '1.6rem', color: 'rgba(255,255,255,0.4)' }}>
                  Ej angivet
                </div>
              )}
            </div>
            <div className="vp-hero-stats">
              <div className="vp-stat">
                <span className="vp-stat-val">{totalFlaskor}</span>
                <span className="vp-stat-lbl">Flaskor</span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-val">{grupperade.length}</span>
                <span className="vp-stat-lbl">Unika viner</span>
              </div>
            </div>
          </div>
        )}

        {/* Wine list */}
        {grupperade.length === 0 ? (
          <div className="vp-empty">
            <div className="vp-empty-icon">🍾</div>
            <p className="vp-empty-title">Potten är tom ännu</p>
            <p className="vp-empty-text">Inga viner har lagts till — registrera dig och välj din flaska!</p>
          </div>
        ) : (
          <div className="vp-list">
            {grupperade.map((v, i) => (
              <a
                key={v.vin_namn + i}
                href={v.vin_url || '#'}
                target={v.vin_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="vp-card"
                onClick={!v.vin_url ? (e) => e.preventDefault() : undefined}
              >
                <div className="vp-card-inner">
                  {/* Image */}
                  <div className="vp-img-panel">
                    {v.bild_url ? (
                      <img src={v.bild_url} alt={v.vin_namn} />
                    ) : (
                      <span className="vp-img-emoji">🍷</span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="vp-card-body">
                    <div className="vp-card-top">
                      <span className="vp-wine-name" title={v.vin_namn}>{v.vin_namn}</span>
                      {v.antal > 1 && (
                        <span className="vp-badge multi">×{v.antal}</span>
                      )}
                      {v.betalt === 'betalt' && (
                        <span className="vp-badge paid">✓ Betalt</span>
                      )}
                    </div>
                    <div className="vp-wine-meta">
                      {v.vin_pris && (
                        <span className="vp-wine-price">
                          {v.antal > 1
                            ? `${v.vin_pris} kr × ${v.antal} = ${(v.antal * Number(v.vin_pris)).toLocaleString('sv-SE')} kr`
                            : `${Number(v.vin_pris).toLocaleString('sv-SE')} kr`}
                        </span>
                      )}
                      {v.ägare?.length > 0 && (
                        <span className="vp-wine-owner">
                          {v.ägare.slice(0, 2).join(', ')}
                          {v.ägare.length > 2 ? ` +${v.ägare.length - 2}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  {v.vin_url && (
                    <div className="vp-card-arrow">›</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )
}