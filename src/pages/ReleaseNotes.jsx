/**
 * ReleaseNotes.jsx — "Uppdateringar"
 *
 * Visar release notes som genereras från git-historiken vid build
 * (scripts/gen-release-notes.mjs → src/generated/releaseNotes.json).
 * Endast användarnära commits (feat/fix/perf/style) tas med.
 */
import releaseNotes from '../generated/releaseNotes.json'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap');

  .rn-wrap { max-width:720px; margin:0 auto; padding:2rem 1rem 4rem; }
  .rn-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:#C8102E; margin-bottom:.3rem; }
  .rn-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(1.8rem,6vw,2.8rem); font-weight:700; color:#0a1628; letter-spacing:.02em; line-height:1; margin-bottom:.4rem; }
  .rn-intro { font-family:'Barlow',sans-serif; font-size:.9rem; color:#777; margin-bottom:1.75rem; line-height:1.6; }

  .rn-group { margin-bottom:1.5rem; }
  .rn-date { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0a1628; margin:0 0 .6rem; display:flex; align-items:center; gap:.6rem; }
  .rn-date::after { content:''; flex:1; height:1px; background:rgba(0,0,0,.08); }

  .rn-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px; padding:.4rem .25rem; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  .rn-item { display:flex; align-items:flex-start; gap:10px; padding:.55rem .75rem; border-bottom:.5px solid rgba(0,0,0,.05); }
  .rn-item:last-child { border-bottom:none; }
  .rn-dot { flex-shrink:0; width:7px; height:7px; border-radius:50%; background:#1a7a40; margin-top:7px; }
  .rn-text { flex:1; font-family:'Barlow',sans-serif; font-size:.9rem; color:#2a2a2a; line-height:1.45; min-width:0; }
  .rn-scope { font-family:'Barlow Condensed',sans-serif; font-size:.62rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#aaa; background:rgba(0,0,0,.04); border-radius:5px; padding:1px 6px; margin-right:6px; }
  .rn-empty { text-align:center; color:#aaa; font-family:'Barlow',sans-serif; padding:3rem 1rem; }
`

function formateraDatum(d) {
  const dt = new Date(`${d}T00:00:00`)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReleaseNotes() {
  const grupper = releaseNotes?.groups || []

  return (
    <>
      <style>{STYLES}</style>
      <div className="rn-wrap">
        <p className="rn-eyebrow">VM-tipsen 2026</p>
        <h1 className="rn-title">Uppdateringar</h1>
        <p className="rn-intro">
          Nya funktioner och förbättringar i appen, senaste först.
        </p>

        {grupper.length === 0 ? (
          <p className="rn-empty">Inga uppdateringar att visa än.</p>
        ) : (
          grupper.map((g) => (
            <div key={g.date} className="rn-group">
              <p className="rn-date">{formateraDatum(g.date)}</p>
              <div className="rn-card">
                {g.items.map((it) => (
                  <div key={it.hash} className="rn-item">
                    <span className="rn-dot" aria-hidden="true" />
                    <span className="rn-text">
                      {it.scope && <span className="rn-scope">{it.scope}</span>}
                      {it.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
