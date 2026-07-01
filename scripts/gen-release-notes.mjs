/**
 * gen-release-notes.mjs — genererar release notes från git-historiken.
 *
 * Körs vid build (se package.json "build") och skriver en JSON som
 * src/pages/ReleaseNotes.jsx och footern läser. Endast användarnära commits
 * tas med (feat/fix/perf/style enligt conventional commits); debug, chore,
 * docs, refactor, test m.m. döljs.
 *
 * OBS: I produktion (Netlify-funktioner) finns ingen git vid körning — därför
 * genereras detta vid build, då repot och git finns tillgängligt.
 */
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../src/generated/releaseNotes.json', import.meta.url))

// Vilka conventional-commit-typer som visas. Endast 'feat' — nya funktioner.
// fix/perf/style/refactor/chore m.m. är mer tekniska och döljs.
const TYPMAP = {
  feat: { label: 'Nytt', rank: 0 },
}

function skriv(obj) {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  const antal = (obj.groups || []).reduce((s, g) => s + g.items.length, 0)
  console.log(`[release-notes] ${antal} poster på ${obj.groups?.length ?? 0} datum`)
}

function main() {
  let raw = ''
  try {
    // %h hash, %ad datum, %s subject, %b body. \x1f = fältavgränsare inom en
    // commit, \x1e = avgränsare mellan commits (body kan innehålla radbrytningar).
    raw = execSync('git log --no-merges --pretty=format:%h%x1f%ad%x1f%s%x1f%b%x1e --date=short', {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    })
  } catch {
    // git ej tillgängligt → skriv tomt men krascha ALDRIG bygget.
    console.warn('[release-notes] git ej tillgängligt — skriver tom lista')
    skriv({ generatedAt: new Date().toISOString(), latest: null, groups: [] })
    return
  }

  const parsed = []
  for (const rec of raw.split('\x1e')) {
    const r = rec.replace(/^\s+/, '')          // ta bort ledande radbrytning
    if (!r) continue
    const [hash, date, subject, body = ''] = r.split('\x1f')
    if (!subject) continue
    // type(scope)!: text
    const m = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/)
    if (!m) continue
    const typ = m[1].toLowerCase()
    if (!TYPMAP[typ]) continue                 // dölj icke-användarnära typer
    const text = (m[3] || '').trim()
    if (!text || /^debug\b/i.test(text)) continue
    // Valfri engelsk översättning i commit-body: en rad som börjar med "en:".
    const enRad = body.split('\n').map((l) => l.trim()).find((l) => /^en:/i.test(l))
    const text_en = enRad ? enRad.replace(/^en:\s*/i, '').trim() : null
    parsed.push({
      hash, date, typ,
      label: TYPMAP[typ].label,
      rank: TYPMAP[typ].rank,
      scope: m[2] || null,
      text,
      text_en: text_en || null,
    })
  }

  // Gruppera per datum. git log är redan fallande → mötesordning = nyast först.
  const groups = []
  const idx = {}
  for (const p of parsed) {
    if (idx[p.date] === undefined) { idx[p.date] = groups.length; groups.push({ date: p.date, items: [] }) }
    groups[idx[p.date]].items.push(p)
  }
  for (const g of groups) g.items.sort((a, b) => a.rank - b.rank)

  const latest = parsed[0] ? { date: parsed[0].date, hash: parsed[0].hash } : null
  skriv({ generatedAt: new Date().toISOString(), latest, groups })
}

main()
