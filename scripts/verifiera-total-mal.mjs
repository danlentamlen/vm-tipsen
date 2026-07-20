/**
 * verifiera-total-mal.mjs — kör på din Mac (sandboxen når ej football-data).
 *
 *   node scripts/verifiera-total-mal.mjs
 *
 * Visar mål-totalen (FIFA-officiellt: ordinarie + förlängning, exkl. shootout)
 * och listar alla ET/PEN-matcher så räkningen kan kontrolleras. Förväntat: 308.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { målIMatch, räknaMål } from '../Netlify/functions/total-mal.js'

const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const env = readFileSync(resolve(__dir, '../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
} catch {}

const KEY = process.env.FOOTBALL_DATA_KEY
if (!KEY) { console.error('FOOTBALL_DATA_KEY saknas i .env'); process.exit(1) }

const res = await fetch(
  'https://api.football-data.org/v4/competitions/WC/matches?season=2026&status=FINISHED',
  { headers: { 'X-Auth-Token': KEY } }
)
const data = await res.json()
const matcher = data.matches || []

const { totalMål, speladeMatcher, snitMålPerMatch } = räknaMål(matcher)
console.log(`\nRäknesätt (FIFA: ordinarie + förlängning, exkl. shootout):`)
console.log(`  Mål totalt:       ${totalMål}`)
console.log(`  Spelade matcher:  ${speladeMatcher}`)
console.log(`  Snitt mål/match:  ${snitMålPerMatch}`)

console.log('\n--- ET / straffläggnings-matcher (kontroll) ---')
for (const m of matcher) {
  const dur = m.score?.duration
  if (dur === 'EXTRA_TIME' || dur === 'PENALTY_SHOOTOUT') {
    console.log(
      `${m.stage} ${m.homeTeam?.name} ${m.score?.fullTime?.home}-${m.score?.fullTime?.away} ${m.awayTeam?.name}`,
      `| dur=${dur} et=${m.score?.extraTime?.home}-${m.score?.extraTime?.away}`,
      `pen=${m.score?.penalties?.home}-${m.score?.penalties?.away} → räknas som ${målIMatch(m)} mål`
    )
  }
}
console.log('')
