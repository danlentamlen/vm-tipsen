/**
 * sync-results.js — Schemalagd "writer" (kör var 5:e minut under VM)
 *
 * Ansvar:
 *  1. Hämta resultat från flera källor (football-data.org + valfri sekundärkälla)
 *     och spara NYA slutresultat till Resultat-arket.
 *  2. Räkna om hela topplistan, "bäst igår" och matchpoäng EN gång och skriva
 *     ner förberäknade snapshots — så att de användarvända läs-endpoints
 *     (scores, scores-yesterday, match-stats) slipper läsa hela Tips-arket vid
 *     varje sidladdning. Det är detta som gör startsidan snabb.
 *
 * Skriver:
 *   - Resultat-arket      : nya slutresultat (A=match_id, B=hemma, C=borta)
 *   - Topplista-arket     : förberäknad topplista (synlig/auditbar i Sheets)
 *   - Tips-arket kolumn F : matchpoäng per tips
 *   - Persistent cache    : 'standings:v1', 'yesterday:v1' (snabb läsning)
 *
 * Miljövariabler: FOOTBALL_DATA_KEY, GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS
 * Valfritt (sekundärkälla): THESPORTSDB_LEAGUE
 */
import { getSheets, getRows, ensureSheet, overwriteRange, writeColumn } from './_sheets.js'
import { getMatcher, getLockedSnapshot } from './_lockedData.js'
import { getFinishedResults, mappaAvslutadeTillMatchId, getTopScorers } from './_resultsSource.js'
import {
  beräknaTopplista, beräknaIgår, beräknaTipsPoäng,
  byggResultatMap, byggIgårMatchIds,
} from './_scoring.js'
import { setCached } from './_persistentCache.js'

const TOPPLISTA_SHEET = 'Topplista'
const TOPPLISTA_HEADER = ['user_id', 'namn', 'poäng', 'exakta', 'rätta', 'frågepoäng', 'plats', 'uppdaterad']

const SKYTTELIGA_SHEET = 'Skytteliga'
const SKYTTELIGA_HEADER = ['Spelare', 'Land', 'Mål']

// ── Skrivpaus 09:00–18:00 svensk tid (CEST = UTC+2) ─────────────────────────
// VM 2026 spelas i nordamerikanska tidszoner → ingen match pågår eller avgörs
// förrän tidigast ~18:00 CEST. I fönstret 09–18 CEST gör varje 5-minutersrun
// bara redundanta skrivningar till Sheets (Topplista/Tips-F/Skytteliga skrivs
// om även när inget ändrats). Vi pausar därför skrivningarna då för att spara
// Sheets-kvot och hålla loggen ren. Ren funktion → enkel att enhetstesta.
// OBS: gäller BARA sync-results; odds-fetch har eget schema (15:00 CEST).
// 09:00 CEST = 07:00 UTC, 18:00 CEST = 16:00 UTC.
export function ärSkrivpaus(now = new Date()) {
  const h = now.getUTCHours()
  return h >= 7 && h < 16
}

export default async () => {
  if (!process.env.FOOTBALL_DATA_KEY && !process.env.THESPORTSDB_LEAGUE) {
    console.error('[sync-results] Ingen resultatkälla konfigurerad')
    return
  }

  if (ärSkrivpaus()) {
    console.log('[sync-results] Skrivpaus 09–18 CEST — hoppar över (inga matcher i fönstret)')
    return
  }

  try {
    const sheets = await getSheets()

    // ── 1. Matchlookup från (cachat) Matcher-ark ────────────────────────────
    const matcherRader = await getMatcher()
    if (!matcherRader || matcherRader.length === 0) {
      console.log('[sync-results] Inga matcher ännu')
      return
    }
    // ── 2. Befintliga resultat ──────────────────────────────────────────────
    const befintligaRader = await getRows(sheets, 'Resultat!A2:C1000')
    const sparade = new Set(befintligaRader.map((r) => r[0]).filter(Boolean))

    // ── 3. Hämta avslutade matcher (sammanslaget från alla källor) ──────────
    // OBS: getFinishedResults() returnerar BARA status===FINISHED med kända mål,
    // så vi skriver aldrig resultat för en match som inte är slutspelad.
    let avslutade = []
    try {
      avslutade = await getFinishedResults()
    } catch (err) {
      console.error('[sync-results] Kunde inte hämta resultat:', err.message)
      // fortsätt ändå — vi kan fortfarande räkna om snapshot på befintliga data
    }
    console.log(`[sync-results] ${avslutade.length} avslutade matcher från källor`)

    // ── 4. Mappa till våra match_id (exakt + omvänd ordning) ─────────────────
    const { rader: mappade, omatchade } = mappaAvslutadeTillMatchId(avslutade, matcherRader)

    // Avslutade resultat utan matchning i Matcher-arket loggas högljutt i stället
    // för att tyst försvinna — oftast platshållarnamn (t.ex. "UEFA Path A winner")
    // som inte uppdaterats med det riktiga laget. Då skrivs inget resultat och
    // inga poäng delas ut förrän namnet i Matcher-arket rättas.
    if (omatchade.length > 0) {
      console.warn(`[sync-results] ⚠️ ${omatchade.length} avslutade matcher MATCHAR INTE Matcher-arket — kontrollera lagnamnen:`)
      for (const m of omatchade) {
        console.warn(`   • ${m.hemmalag} ${m.hemma}–${m.borta} ${m.bortalag} (källa: ${m.källa})`)
      }
    }

    // Bara match_id som inte redan är sparade blir nya rader att lägga till
    const nya = mappade.filter((r) => !sparade.has(r[0]))

    // ── 5. Spara nya resultat ───────────────────────────────────────────────
    if (nya.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Resultat!A:C',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: nya },
      })
      console.log(`[sync-results] ✅ Sparade ${nya.length} nya resultat`)
    } else {
      console.log('[sync-results] Inga nya resultat')
    }

    // Sammanlagd resultatuppsättning efter append (slipper läsa om Resultat)
    const allaResultatRader = [...befintligaRader, ...nya]

    // ── 6. Räkna om snapshots ───────────────────────────────────────────────
    // Körs av den schemalagda writern (ej användarvänd) → ok att den är tyngre.
    await räknaOmSnapshots(sheets, matcherRader, allaResultatRader)

    // ── 7. Uppdatera skytteligan (live → Skytteliga-arket) ──────────────────
    // Widgeten på startsidan (top-scorers) läser detta ark; writern håller det
    // färskt så att läsvägen förblir billig (ett litet ark, inget API per anrop).
    await uppdateraSkytteliga(sheets)

  } catch (err) {
    console.error('[sync-results] FEL:', err)
  }
}

/**
 * Läser Tips + låsta ark, räknar om topplista / igår / matchpoäng och skriver
 * snapshots till Sheets + persistent cache.
 */
async function räknaOmSnapshots(sheets, matcherRader, resultatRader) {
  // Tips läses här (i writern), INTE i de användarvända endpoints.
  const tipsRader = await getRows(sheets, 'Tips!A2:E100000')
  const { användare, frågor, frågorSvar, viner } = await getLockedSnapshot()

  // ── Topplista ──
  const standings = beräknaTopplista({
    resultatRader,
    tipsRader,
    frågorRader: frågor,
    frågorSvarRader: frågorSvar,
    användareRader: användare,
    vinerRader: viner,
  })

  const uppdaterad = new Date().toISOString()
  await ensureSheet(sheets, TOPPLISTA_SHEET)
  await overwriteRange(sheets, TOPPLISTA_SHEET, [
    TOPPLISTA_HEADER,
    ...standings.map((r) => [
      r.user_id, r.namn, r.poäng, r.exakta, r.rätta, r.frågepoäng, r.plats, uppdaterad,
    ]),
  ])
  await setCached('standings:v1', standings)

  // ── Bäst igår ──
  const nu = new Date()
  const igårIds = byggIgårMatchIds(matcherRader, nu)
  const igår = beräknaIgår({
    igårMatchIds: igårIds,
    resultatRader,
    tipsRader,
    användareRader: användare,
    antal: 3,
  })
  // Samma datum-nyckel som scores-yesterday läser med
  await setCached(`yesterday:v1:${nu.toISOString().slice(0, 10)}`, igår)

  // ── Matchpoäng per tips → Tips kolumn F ──
  if (tipsRader.length > 0) {
    const resultatMap = byggResultatMap(resultatRader)
    const poängKol = beräknaTipsPoäng(tipsRader, resultatMap)
    await writeColumn(sheets, `Tips!F2:F${tipsRader.length + 1}`, poängKol)
  }

  console.log(`[sync-results] Snapshot klar: ${standings.length} deltagare, ${igår.length} i "bäst igår"`)
}

/**
 * Hämtar topp-målskyttar live och skriver dem till Skytteliga-arket, som
 * startsidans top-scorers-widget läser. Allt är inkapslat: om hämtningen
 * misslyckas eller VM inte startat (tom lista) behålls befintligt ark orört,
 * så vi aldrig nollställer en redan ifylld skytteliga av misstag.
 */
async function uppdateraSkytteliga(sheets) {
  try {
    const skyttar = await getTopScorers(15)
    if (skyttar.length === 0) {
      console.log('[sync-results] Inga skyttekungar än — behåller befintlig Skytteliga')
      return
    }
    await ensureSheet(sheets, SKYTTELIGA_SHEET)
    await overwriteRange(sheets, SKYTTELIGA_SHEET, [
      SKYTTELIGA_HEADER,
      ...skyttar.map((s) => [s.spelare, s.land, s.mål]),
    ])
    console.log(`[sync-results] ✅ Skytteliga uppdaterad: ${skyttar.length} spelare`)
  } catch (err) {
    console.error('[sync-results] Kunde inte uppdatera skytteligan:', err.message)
  }
}
