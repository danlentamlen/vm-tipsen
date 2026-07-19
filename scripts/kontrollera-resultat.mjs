/**
 * kontrollera-resultat.mjs — READ-ONLY kontroll av Resultat-arket.
 * Kör på din Mac (sandboxen når varken Google eller football-data):
 *
 *   node scripts/kontrollera-resultat.mjs
 *
 * Jämför varje rad i Resultat-arket mot appens auktoritativa 90-min-beräkning
 * (samma källa och logik som sync-results självläkning) och flaggar:
 *   • FEL     – arket har annat resultat än beräknat 90-min-resultat
 *   • SAKNAS  – matchen är avslutad men finns inte i arket
 *   • OMAPPAD – avslutad match som inte matchar Matcher-arket (t.ex. platshållarnamn)
 *
 * Skriver INGET. Rör inget. Bara rapport.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const env = readFileSync(resolve(__dir, '../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
} catch {}
// _sheets.js läser GOOGLE_CREDENTIALS ur env; faller tillbaka på fil om saknas.
if (!process.env.GOOGLE_CREDENTIALS) {
  try {
    process.env.GOOGLE_CREDENTIALS = readFileSync(
      resolve(__dir, '../google-credentials.json'), 'utf8')
  } catch {}
}

const { getSheets, getRows } = await import('../Netlify/functions/_sheets.js')
const { getMatcher } = await import('../Netlify/functions/_lockedData.js')
const { getFinishedResults, mappaAvslutadeTillMatchId } =
  await import('../Netlify/functions/_resultsSource.js')

const sheets = await getSheets()
const matcherRader = await getMatcher()
const resultatRader = await getRows(sheets, 'Resultat!A2:D1000')

// match_id → { hemma, borta } från arket
const arket = new Map()
for (const r of resultatRader) {
  if (r[0]) arket.set(r[0], { hemma: String(r[1] ?? ''), borta: String(r[2] ?? '') })
}
// match_id → "Hemma – Borta" (läsbart namn) från Matcher-arket
const namn = new Map()
for (const r of matcherRader) {
  if (r[0]) namn.set(r[0], `${r[3] ?? '?'} – ${r[4] ?? '?'}`)
}

const avslutade = await getFinishedResults()
const { rader: beräknade, omatchade } = mappaAvslutadeTillMatchId(avslutade, matcherRader)

const fel = [], saknas = []
for (const rad of beräknade) {
  const [mid, h, b] = rad
  const label = namn.get(mid) || mid
  if (!arket.has(mid)) { saknas.push(`${mid}  ${label}  → borde vara ${h}–${b}`); continue }
  const a = arket.get(mid)
  if (a.hemma !== String(h) || a.borta !== String(b)) {
    fel.push(`${mid}  ${label}  ARKET: ${a.hemma}–${a.borta}  BORDE: ${h}–${b}`)
  }
}

console.log(`\nResultat-arket: ${arket.size} rader | avslutade från källor: ${avslutade.length} | mappade: ${beräknade.length}\n`)

console.log(`=== FEL (${fel.length}) — arket avviker från 90-min-resultatet ===`)
fel.forEach(x => console.log('  ✗', x))
if (!fel.length) console.log('  (inga)')

console.log(`\n=== SAKNAS (${saknas.length}) — avslutade men ej i arket ===`)
saknas.forEach(x => console.log('  •', x))
if (!saknas.length) console.log('  (inga)')

console.log(`\n=== OMAPPADE (${omatchade.length}) — matchar ej Matcher-arket ===`)
omatchade.forEach(m => console.log(`  • ${m.hemmalag} ${m.hemma}–${m.borta} ${m.bortalag} (källa: ${m.källa})`))
if (!omatchade.length) console.log('  (inga)')
console.log('')
