import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .info-wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem 1rem 5rem;
  }

  .info-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: #C8102E; margin-bottom: 0.3rem;
  }
  .info-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(1.8rem, 6vw, 2.8rem); font-weight: 700;
    color: #0a1628; letter-spacing: 0.02em; line-height: 1;
    margin-bottom: 0.75rem;
  }
  .info-lead {
    font-family: 'Barlow', sans-serif;
    font-size: 0.98rem; color: #666; line-height: 1.7;
    margin-bottom: 2.5rem; max-width: 600px;
  }

  .info-section { margin-bottom: 2.5rem; }
  .info-section-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem;
  }
  .info-section-icon {
    width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #0a1628, #1a2e4a);
  }
  .info-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.2rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; color: #0a1628;
  }

  .points-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .pts-card {
    border-radius: 10px; padding: 1.1rem 1rem;
    display: flex; flex-direction: column; gap: 0.3rem;
  }
  .pts-card.exact  { background: rgba(200,16,46,0.06);  border: 1px solid rgba(200,16,46,0.15); }
  .pts-card.right  { background: rgba(10,22,40,0.05);   border: 1px solid rgba(10,22,40,0.1); }
  .pts-card.bonus  { background: rgba(197,160,40,0.08); border: 1px solid rgba(197,160,40,0.25); }
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
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #C8102E; padding-top: 2px; line-height: 1.3;
  }
  .tl-center {
    display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0; width: 20px;
  }
  .tl-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #0a1628; border: 2px solid #C5A028;
    flex-shrink: 0; margin-top: 4px;
  }
  .tl-dot.deadline {
    background: #C8102E; border-color: #C8102E;
    width: 12px; height: 12px;
  }
  .tl-line {
    width: 2px; background: rgba(0,0,0,0.07);
    flex: 1; margin: 4px 0;
  }
  .tl-item:last-child .tl-line { display: none; }
  .tl-right { padding: 0 0 1.25rem 1rem; }
  .tl-event-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.95rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; color: #0a1628; margin-bottom: 2px;
  }
  .tl-event-title.deadline { color: #C8102E; }
  .tl-event-desc {
    font-family: 'Barlow', sans-serif;
    font-size: 0.83rem; color: #777; line-height: 1.5;
  }
  .tl-deadline-badge {
    display: inline-block;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(200,16,46,0.08); color: #C8102E;
    border: 1px solid rgba(200,16,46,0.2);
    border-radius: 100px; padding: 1px 8px;
    margin-bottom: 3px;
  }

  .facts-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }
  .fact-card {
    background: #fff; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 10px; padding: 1rem 0.875rem; text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .fact-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.6rem; font-weight: 700; color: #0a1628;
    line-height: 1; display: block; margin-bottom: 0.25rem;
  }
  .fact-label {
    font-family: 'Barlow', sans-serif;
    font-size: 0.72rem; color: #999; letter-spacing: 0.05em;
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
  return (
    <>
      <style>{STYLES}</style>
      <div className="info-wrap">

        <p className="info-eyebrow">VM-tipsen 2026</p>
        <h1 className="info-title">Regler & Information</h1>
        <p className="info-lead">
          Allt du behöver veta om hur tävlingen fungerar — poängsystem, vinpott, tilläggsfrågor och viktiga datum.
        </p>

        {/* Poängsystem */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🏆</div>
            <h2 className="info-section-title">Poängsystem</h2>
          </div>
          <div className="points-row">
            <div className="pts-card exact">
              <span className="pts-value">5p</span>
              <span className="pts-label">Exakt resultat</span>
              <p className="pts-desc">Du gissade exakt rätt antal mål för båda lagen.</p>
            </div>
            <div className="pts-card right">
              <span className="pts-value">2p</span>
              <span className="pts-label">Rätt utgång</span>
              <p className="pts-desc">Rätt vinnare eller oavgjort, men inte exakt resultat.</p>
            </div>
            <div className="pts-card bonus">
              <span className="pts-value">+p</span>
              <span className="pts-label">Tilläggsfrågor</span>
              <p className="pts-desc">Rätt svar ger bonuspoäng — varje fråga har sitt eget värde.</p>
            </div>
          </div>
        </div>

        <div className="info-divider" />

        {/* Prisfördelning */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🏆</div>
            <h2 className="info-section-title">Prisfördelning</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {[
              { plats:'1:a plats', emoji:'🥇', pct:50 },
              { plats:'2:a plats', emoji:'🥈', pct:25 },
              { plats:'3:e plats', emoji:'🥉', pct:10 },
              { plats:'4:e plats', emoji:'4️⃣',   pct:5  },
              { plats:'5:e plats', emoji:'5️⃣',   pct:3  },
              { plats:'Specialpriser', emoji:'⚽⚽⚽', pct:7 }
            ].map((p) => (
              <div key={p.plats} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:10, padding:'0.875rem 1rem', boxShadow:'0 1px 3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:'0.9rem', fontWeight:500, color:'#0a1628' }}>
                  {p.emoji} {p.plats}
                </span>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'1.2rem', fontWeight:700, color:'#C8102E' }}>
                  {p.pct}%
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'0.82rem', color:'#888', marginTop:'0.75rem', lineHeight:1.5 }}>
            Procentandelarna beräknas på det totala värdet av alla betalda vinflaskor i potten.
          </p>
        </div>

        <div className="info-divider" />

        {/* Regler */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">📋</div>
            <h2 className="info-section-title">Regler</h2>
          </div>
          <div className="rules-list">
            <div className="rule-item">
              <span className="rule-icon">⏰</span>
              <p className="rule-text">
                <strong>Deadline för tips:</strong> Gruppspelet och tilläggsfrågor låses <strong>11 juni</strong>. Slutspelsomgångar låses <strong>4 timmar</strong> innan första matchen i respektive omgång.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">⚽</span>
              <p className="rule-text">
                <strong>Matchresultat:</strong> Poäng räknas på resultatet efter ordinarie tid (90 minuter). Förlängning och straffar påverkar inte ditt tips.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">✏️</span>
              <p className="rule-text">
                <strong>Ändringar tillåtna:</strong> Du kan uppdatera dina tips hur många gånger du vill fram tills respektive deadline.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🎯</span>
              <p className="rule-text">
                <strong>Tilläggsfrågor:</strong> Frågorna har olika poängvärden och låses permanent den <strong>11 juni</strong> tillsammans med gruppspelet.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🏅</span>
              <p className="rule-text">
                <strong>Vid lika poäng:</strong> Delad placering avgörs i denna ordning — (1) den som tippat rätt lag som vinnare av VM, (2) flest exakta 5-poängare, (3) dyraste vinflaska.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">⚽</span>
              <p className="rule-text">
                <strong>Extrapris — totala VM-mål:</strong> Den deltagare som är närmast rätt antal totala mål i VM vinner ett separat extrapris.
              </p>
            </div>
            <div className="rule-item">
              <span className="rule-icon">👁️</span>
              <p className="rule-text">
                <strong>Transparens:</strong> Tipsfördelningen för varje match visas för alla <strong>efter att respektive omgång låsts</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="info-divider" />

        {/* Vinpotten */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🍷</div>
            <h2 className="info-section-title">Vinpotten</h2>
          </div>
          <div className="wine-card">
            <span className="wine-emoji">🍷</span>
            <div className="wine-body">
              <p className="wine-card-title">En flaska per deltagare</p>
              <p className="wine-card-text">
                Varje deltagare satsar <strong>en vinflaska</strong> som insats i potten. Du väljer själv vilken flaska och anger en länk när du registrerar dig.<br /><br />
                Alla deltagarnas flaskor samlas i vinpotten och visas öppet för alla att se. <strong>Den som toppar topplistan</strong> när VM-finalen är avgjord den <strong>19 juli 2026</strong> vinner 50% av samlingen.
              </p>
            </div>
          </div>
        </div>

        <div className="info-divider" />

        {/* Viktiga datum & deadlines */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">📅</div>
            <h2 className="info-section-title">Viktiga datum & deadlines</h2>
          </div>
          <div className="timeline">

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">Nu</span></div>
              <div className="tl-center"><div className="tl-dot" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-event-title">Registrering & tips öppet</div>
                <p className="tl-event-desc">Skapa konto, välj din vinflaska och börja lämna tips på matcherna och tilläggsfrågor.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">11 jun</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 1</div>
                <div className="tl-event-title deadline">Gruppspel & tilläggsfrågor låses</div>
                <p className="tl-event-desc">Alla gruppspelets 72 matcher samt samtliga tilläggsfrågor stängs för inmatning inför VM-premiären. Inga ändringar möjliga efter detta.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">28 jun</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 2</div>
                <div className="tl-event-title deadline">Sextondelsfinaler låses</div>
                <p className="tl-event-desc">4 timmar innan första sextondelsfinalen (28 jun, 21:00 svensk tid) stängs tips för alla 16 sextondelsfinalsmatcher.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">4 jul</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 3</div>
                <div className="tl-event-title deadline">Åttondelsfinaler låses</div>
                <p className="tl-event-desc">4 timmar innan första åttondelsfinalen (4 jul, 19:00 svensk tid) stängs tips för åttondelsfinalerna.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">9 jul</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 4</div>
                <div className="tl-event-title deadline">Kvartsfinaler låses</div>
                <p className="tl-event-desc">4 timmar innan första kvartsfinalen (9 jul, 22:00 svensk tid) stängs tips för kvartsfinalmatcherna.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">14 jul</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 5</div>
                <div className="tl-event-title deadline">Semifinaler låses</div>
                <p className="tl-event-desc">4 timmar innan första semifinalen (14 jul, 21:00 svensk tid) stängs tips för semifinalerna.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">18 jul</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 6</div>
                <div className="tl-event-title deadline">Match om 3:e plats låses</div>
                <p className="tl-event-desc">4 timmar innan bronsmatch (18 jul, 23:00 svensk tid) stängs tips för matchen om tredje plats.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">19 jul</span></div>
              <div className="tl-center"><div className="tl-dot deadline" /><div className="tl-line" /></div>
              <div className="tl-right">
                <div className="tl-deadline-badge">Deadline 7</div>
                <div className="tl-event-title deadline">Finalen låses</div>
                <p className="tl-event-desc">4 timmar innan VM-finalen (19 jul, 21:00 svensk tid) stängs det sista tipset. Finalen spelas på MetLife Stadium i New York/New Jersey.</p>
              </div>
            </div>

            <div className="tl-item">
              <div className="tl-left"><span className="tl-date">Efter finalen</span></div>
              <div className="tl-center"><div className="tl-dot" /></div>
              <div className="tl-right">
                <div className="tl-event-title">Vinnaren korad & vinpotten delas ut</div>
                <p className="tl-event-desc">Den med flest poäng vinner 50% av vinpotten. Grattis på förhand!</p>
              </div>
            </div>

          </div>
        </div>

        <div className="info-divider" />

        {/* VM 2026-fakta */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">🌍</div>
            <h2 className="info-section-title">VM 2026 — snabbfakta</h2>
          </div>
          <div className="facts-grid">
            <div className="fact-card"><span className="fact-value">48</span><span className="fact-label">Deltagande lag</span></div>
            <div className="fact-card"><span className="fact-value">104</span><span className="fact-label">Totala matcher</span></div>
            <div className="fact-card"><span className="fact-value">16</span><span className="fact-label">Värdstäder</span></div>
            <div className="fact-card"><span className="fact-value">3</span><span className="fact-label">Värdnationer</span></div>
            <div className="fact-card"><span className="fact-value">11/6</span><span className="fact-label">Premiär</span></div>
            <div className="fact-card"><span className="fact-value">19/7</span><span className="fact-label">Final</span></div>
          </div>
        </div>

        <div className="info-divider" />

        {/* FAQ */}
        <div className="info-section">
          <div className="info-section-header">
            <div className="info-section-icon">❓</div>
            <h2 className="info-section-title">Vanliga frågor</h2>
          </div>
          <div className="faq-list">
            <FaqItem
              q="Måste jag tippa alla 104 matcher?"
              a="Nej, du kan lämna tips på så många eller få matcher du vill. Du får bara poäng för de matcher du faktiskt tippat. Det lönar sig dock att tippa så många som möjligt för att maximera poängen."
            />
            <FaqItem
              q="Vad händer om jag glömmer tippa en match?"
              a="Du får inga poäng för den matchen — men det påverkar inte dina övriga tips. Du kan tippa fler matcher ända fram tills respektive deadline."
            />
            <FaqItem
              q="Hur fungerar förlängning och straffar?"
              a="Poäng räknas alltid på resultatet efter ordinarie tid (90 minuter). Om en match slutar 1–1 efter 90 minuter men avgörs på straffar räknas det som oavgjort för tippingens skull."
            />
            <FaqItem
              q="Kan jag ändra mitt tips efter att jag sparat det?"
              a="Ja, du kan uppdatera dina tips hur många gånger du vill — ända fram tills respektive deadline. Senast sparade tips är det som gäller."
            />
            <FaqItem
              q="När visas tipsfördelningen för matcherna?"
              a="Fördelningen (hur alla tippade) visas först när respektive omgång är låst. Fram till dess ser du bara ditt eget tips."
            />
            <FaqItem
              q="Hur vet jag vilken vinflaska jag ska välja?"
              a="Det är helt fritt! Välj en flaska du tycker om eller som du tror passar övriga deltagare. Du anger ett namn och en länk (t.ex. till Systembolaget) när du registrerar dig. Flaskan kan bytas fram tills tävlingen låses den 11 juni."
            />
            <FaqItem
              q="Kan jag tippa slutspelsmatcher innan jag vet vilka lag som spelar?"
              a="Ja! Du kan lämna tips på slutspelsmatcher redan nu — lagen visas som platshållare (t.ex. 'Vinnare Grupp A') tills gruppspelet är klart. Du kan uppdatera dina slutspelstips fram tills respektive deadline."
            />
          </div>
        </div>

        <div className="info-cta">
          <p className="info-cta-text">Redo att börja tippa? Registrera dig och välj din vinflaska!</p>
          <Link to="/register" className="info-cta-btn">Anmäl dig nu</Link>
        </div>

      </div>
    </>
  )
}