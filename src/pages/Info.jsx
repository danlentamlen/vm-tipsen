import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .info-wrap { max-width: 680px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .info-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem;
  }
  .info-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1; margin-bottom: 0.5rem;
  }
  .info-lead {
    font-family: 'Barlow', sans-serif;
    font-size: 0.93rem; color: #666; line-height: 1.65; margin-bottom: 2rem;
  }

  .info-section { margin-bottom: 0; }
  .info-section-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 1.1rem;
  }
  .info-section-icon {
    font-size: 1.2rem; line-height: 1;
  }
  .info-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.25rem; font-weight: 700; color: #0a1628; letter-spacing: 0.02em;
  }

  /* Points grid */
  .points-row {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .pts-card {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px; padding: 1.1rem 1rem; text-align: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    display: flex; flex-direction: column; gap: 4px;
  }
  .pts-card.exact { border-top: 3px solid #C8102E; }
  .pts-card.right  { border-top: 3px solid #0a1628; }
  .pts-card.bonus  { border-top: 3px solid #C5A028; }
  .pts-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.8rem; font-weight: 700; line-height: 1;
  }
  .pts-card.exact .pts-value  { color: #C8102E; }
  .pts-card.right .pts-value  { color: #0a1628; }
  .pts-card.bonus .pts-value  { color: #8a6e1a; }
  .pts-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #555;
  }
  .pts-desc {
    font-family: 'Barlow', sans-serif;
    font-size: 0.78rem; color: #888; line-height: 1.5;
  }

  .rules-list {
    display: flex; flex-direction: column; gap: 0.625rem;
  }
  .rule-item {
    display: flex; align-items: flex-start; gap: 12px;
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 10px; padding: 0.875rem 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .rule-icon {
    font-size: 1rem; flex-shrink: 0; margin-top: 1px; width: 20px; text-align: center;
  }
  .rule-text {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; color: #333; line-height: 1.55;
  }
  .rule-text strong { color: #0a1628; font-weight: 600; }

  .wine-card {
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
    border-radius: 12px; padding: 1.75rem;
    display: flex; gap: 1.25rem; align-items: flex-start;
  }
  .wine-emoji { font-size: 2.5rem; flex-shrink: 0; line-height: 1; }
  .wine-card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.1rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #F0D060; margin-bottom: 0.5rem;
  }
  .wine-card-text {
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem; color: rgba(255,255,255,0.65); line-height: 1.7;
  }
  .wine-card-text strong { color: #F0D060; font-weight: 500; }

  /* Timeline */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .tl-item { display: flex; gap: 0; position: relative; }
  .tl-left {
    width: 110px; flex-shrink: 0; padding: 0 1rem 0 0; text-align: right;
  }
  .tl-date {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.8rem; font-weight: 700; color: #aaa;
    padding-top: 2px; display: block;
  }
  .tl-center {
    display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0; width: 24px;
  }
  .tl-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #ddd; border: 2px solid #fff;
    box-shadow: 0 0 0 2px #ddd; flex-shrink: 0; margin-top: 4px;
  }
  .tl-dot.deadline { background: #C8102E; box-shadow: 0 0 0 2px #C8102E; }
  .tl-line {
    flex: 1; width: 2px; background: rgba(0,0,0,0.06); min-height: 32px;
  }
  .tl-right {
    padding: 0 0 2rem 1rem;
  }
  .tl-deadline-badge {
    display: inline-block;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #C8102E;
    background: rgba(200,16,46,0.08); border: 1px solid rgba(200,16,46,0.2);
    border-radius: 4px; padding: 1px 7px; margin-bottom: 4px;
  }
  .tl-event-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem; font-weight: 700; color: #0a1628;
    letter-spacing: 0.02em; margin-bottom: 4px;
  }
  .tl-event-title.deadline { color: #C8102E; }
  .tl-event-desc {
    font-family: 'Barlow', sans-serif;
    font-size: 0.82rem; color: #777; line-height: 1.55;
  }

  /* Facts grid */
  .facts-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
  }
  .fact-card {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 10px; padding: 1rem; text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    display: flex; flex-direction: column; gap: 4px;
  }
  .fact-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.6rem; font-weight: 700; color: #0a1628; line-height: 1;
  }
  .fact-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: #999; letter-spacing: 0.05em;
  }

  .faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .faq-item {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 10px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .faq-q {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; font-weight: 600; color: #0a1628;
    padding: 0.875rem 1rem;
    display: flex; justify-content: space-between; align-items: center;
    cursor: pointer; gap: 12px;
  }
  .faq-q:hover { background: #fafaf8; }
  .faq-chevron {
    font-size: 0.65rem; color: #bbb; flex-shrink: 0; transition: transform 0.2s;
  }
  .faq-chevron.open { transform: rotate(180deg); }
  .faq-a {
    font-family: 'Barlow', sans-serif;
    font-size: 0.87rem; color: #555; line-height: 1.65;
    padding: 0 1rem 0.875rem;
  }

  .info-cta {
    background: rgba(200,16,46,0.06); border: 1px solid rgba(200,16,46,0.15);
    border-radius: 12px; padding: 1.5rem; text-align: center; margin-top: 2.5rem;
  }
  .info-cta-text {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; color: #555; margin-bottom: 1rem;
  }
  .info-cta-btn {
    display: inline-block; text-decoration: none;
    padding: 12px 28px; border-radius: 8px;
    background: linear-gradient(135deg, #C8102E, #e01535);
    color: #fff; font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.9rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    transition: opacity 0.2s;
  }
  .info-cta-btn:hover { opacity: 0.88; }

  .info-divider { height: 1px; background: rgba(0,0,0,0.07); margin: 2.5rem 0; }

  @media (max-width: 520px) {
    .points-row { grid-template-columns: 1fr; }
    .tl-left { width: 80px; }
    .facts-grid { grid-template-columns: repeat(2, 1fr); }
  }
`

function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="faq-item">
      <div className="faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={`faq-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

export default function Info() {
  const { t } = useLanguage()

  const poäng    = t('info.poäng')
  const regler   = t('info.regler.items')
  const vinpott  = t('info.vinpott')
  const tidslinje = t('info.tidslinje.items')
  const fakta    = t('info.fakta.items')
  const faqItems = t('info.faq.items')
  const prisrader = t('info.prisfördelning.rader')

  return (
    <>
      <style>{STYLES}</style>
      <div className="info-wrap">

        <p className="info-eyebrow">{t('info.eyebrow')}</p>
        <h1 className="info-title">{t('info.titel')}</h1>
        <p className="info-lead">{t('info.lead')}</p>

        {/* Poängsystem */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🏆</div>
            <h2 className="info-section-title">{t('info.poäng.titel')}</h2>
          </div>
          <div className="points-row">
            <div className="pts-card exact">
              <span className="pts-value">5p</span>
              <span className="pts-label">{poäng.exakt}</span>
              <p className="pts-desc">{poäng.exaktDesc}</p>
            </div>
            <div className="pts-card right">
              <span className="pts-value">2p</span>
              <span className="pts-label">{poäng.rätt}</span>
              <p className="pts-desc">{poäng.rättDesc}</p>
            </div>
            <div className="pts-card bonus">
              <span className="pts-value">+p</span>
              <span className="pts-label">{poäng.bonus}</span>
              <p className="pts-desc">{poäng.bonusDesc}</p>
            </div>
          </div>
        </div>

        <div className="info-divider" />

        {/* Prisfördelning */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🏆</div>
            <h2 className="info-section-title">{t('info.prisfördelning.titel')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {prisrader.map((p) => (
              <div key={p.plats} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '0.875rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '0.9rem', fontWeight: 500, color: '#0a1628' }}>
                  {p.emoji} {p.plats}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#C8102E' }}>
                  {p.pct}%
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '0.82rem', color: '#888', marginTop: '0.75rem', lineHeight: 1.5 }}>
            {t('info.prisfördelning.not')}
          </p>
        </div>

        <div className="info-divider" />

        {/* Regler */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">📋</div>
            <h2 className="info-section-title">{t('info.regler.titel')}</h2>
          </div>
          <div className="rules-list">
            {regler.map((r, i) => (
              <div key={i} className="rule-item">
                <span className="rule-icon">{r.ikon}</span>
                <p className="rule-text" dangerouslySetInnerHTML={{ __html: r.text }} />
              </div>
            ))}
          </div>
        </div>

        <div className="info-divider" />

        {/* Vinpotten */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🍷</div>
            <h2 className="info-section-title">{vinpott.titel}</h2>
          </div>
          <div className="wine-card">
            <span className="wine-emoji">🍷</span>
            <div className="wine-body">
              <p className="wine-card-title">{vinpott.flaska}</p>
              <p className="wine-card-text" dangerouslySetInnerHTML={{ __html: vinpott.beskrHtml }} />
            </div>
          </div>
        </div>

        <div className="info-divider" />

        {/* Viktiga datum & deadlines */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">📅</div>
            <h2 className="info-section-title">{t('info.tidslinje.titel')}</h2>
          </div>
          <div className="timeline">
            {tidslinje.map((item, i) => (
              <div key={i} className="tl-item">
                <div className="tl-left"><span className="tl-date">{item.datum}</span></div>
                <div className="tl-center">
                  <div className={`tl-dot ${item.deadline ? 'deadline' : ''}`} />
                  {i < tidslinje.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-right">
                  {item.deadline && <div className="tl-deadline-badge">{item.deadline}</div>}
                  <div className={`tl-event-title ${item.deadline ? 'deadline' : ''}`}>{item.titel}</div>
                  <p className="tl-event-desc">{item.beskr}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="info-divider" />

        {/* VM 2026-fakta */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🌍</div>
            <h2 className="info-section-title">{t('info.fakta.titel')}</h2>
          </div>
          <div className="facts-grid">
            {fakta.map((f, i) => (
              <div key={i} className="fact-card">
                <span className="fact-value">{f.värde}</span>
                <span className="fact-label">{f.etikett}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="info-divider" />

        {/* FAQ */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">❓</div>
            <h2 className="info-section-title">{t('info.faq.titel')}</h2>
          </div>
          <div className="faq-list">
            {faqItems.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        <div className="info-cta">
          <p className="info-cta-text">{t('info.cta.text')}</p>
          <Link to="/register" className="info-cta-btn">{t('info.cta.knapp')}</Link>
        </div>

      </div>
    </>
  )
}