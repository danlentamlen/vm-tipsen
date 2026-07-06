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
 *   - Matcher-arket D:E   : lagnamn i knockout-matcher (uppdateras när lag kvalificerar sig)
 *   - Topplista-arket     : förberäknad topplista (synlig/auditbar i Sheets)
 *   - Tips-arket kolumn F : matchpoäng per tips
 *   - Persistent cache    : 'standings:v1', 'yesterday:v1' (snabb läsning)
 *
 * Miljövariabler: FOOTBALL_DATA_KEY, GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS
 * Valfritt (sekundärkälla): THESPORTSDB_LEAGUE
 */
import { getSheets, getRows, ensureSheet, overwriteRange, writeColumn } from './_sheets.js'
import { getMatcher, getLockedSnapshot, refreshLockedSnapshot } from './_lockedData.js'
import { getFinishedResults, mappaAvslutadeTillMatchId, getTopScorers, getAllKnockoutFixtures } from './_resultsSource.js'
import {
  beräknaTopplista, beräknaIgår, beräknaTipsPoäng,
  byggResultatMap, byggIgårMatchIds,
  beräknaFrågeSvarPoäng, beräknaMaxPoäng, parseSnabbasteMål,
} from './_scoring.js'
import { setCached } from './_persistentCache.js'
import { SLUTSPELS_OMGÅNGAR, getSettings } from './_settings.js'

const TOPPLISTA_SHEET = 'Topplista'
// OBS: 'max' ligger SIST (kolumn I) — scores.js läser bara A2:H positionellt,
// så en ny kolumn efter 'uppdaterad' bryter inte befintliga läsare.
const TOPPLISTA_HEADER = ['user_id', 'namn', 'poäng', 'exakta', 'rätta', 'frågepoäng', 'plats', 'uppdaterad', 'max']

const SKYTTELIGA_SHEET = 'Skytteliga'
const SKYTTELIGA_HEADER = ['Spelare', 'Land', 'Mål']

// ── Skrivpaus 10:00–18:00 svensk tid (CEST = UTC+2) ─────────────────────────
// VM 2026 spelas i nordamerikanska tidszoner → ingen match pågår eller avgörs
// förrän tidigast ~18:00 CEST. I fönstret 10–18 CEST gör varje 5-minutersrun
// bara redundanta skrivningar till Sheets (Topplista/Tips-F/Skytteliga skrivs
// om även när inget ändrats). Vi pausar därför skrivningarna då för att spara
// Sheets-kvot och hålla loggen ren. Ren funktion → enkel att enhetstesta.
// OBS: gäller BARA sync-results; odds-fetch har eget schema (15:00 CEST).
// 10:00 CEST = 08:00 UTC, 18:00 CEST = 16:00 UTC.
export function ärSkrivpaus(now = new Date()) {
  const h = now.getUTCHours()
  return h >= 8 && h < 16
}

export default async () => {
  if (!process.env.FOOTBALL_DATA_KEY && !process.env.THESPORTSDB_LEAGUE) {
    console.error('[sync-results] Ingen resultatkälla konfigurerad')
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

    // ── 2. Uppdatera lagnamn i knockout-matcher (alltid, även under skrivpaus)
    // Lag kan kvalificera sig när som helst — vi vill inte vänta till kvällen.
    // Läser Resultat-arket internt för att beräkna gruppstälningar.
    const knockoutUppdaterat = await uppdateraKnockoutLagnamn(sheets, matcherRader)
    const aktuellaMatcherRader = knockoutUppdaterat
      ? (await refreshLockedSnapshot()).matcher
      : matcherRader

    // ── Skrivpaus 09:00–18:00 CEST (07:00–16:00 UTC) ────────────────────────
    // Inga matcher avgörs i nordamerika förrän ~18:00 CEST. De tunga snapshot-
    // skrivningarna (topplista, poäng, skytteliga) körs bara utanför detta fönster.
    if (ärSkrivpaus()) {
      console.log('[sync-results] Skrivpaus 09–18 CEST — knockout-namn uppdaterade, snapshots hoppas över')
      return
    }

    // ── 3. Befintliga resultat ──────────────────────────────────────────────
    const befintligaRader = await getRows(sheets, 'Resultat!A2:D1000')
    const sparade = new Set(befintligaRader.map((r) => r[0]).filter(Boolean))

    // ── 4. Hämta avslutade matcher (sammanslaget från alla källor) ──────────
    let avslutade = []
    try {
      avslutade = await getFinishedResults()
    } catch (err) {
      console.error('[sync-results] Kunde inte hämta resultat:', err.message)
    }
    console.log(`[sync-results] ${avslutade.length} avslutade matcher från källor`)

    // ── 5. Mappa till våra match_id ──────────────────────────────────────────
    const { rader: mappade, omatchade } = mappaAvslutadeTillMatchId(avslutade, aktuellaMatcherRader)

    if (omatchade.length > 0) {
      console.warn(`[sync-results] ⚠️ ${omatchade.length} avslutade matcher MATCHAR INTE Matcher-arket:`)
      for (const m of omatchade) {
        console.warn(`   • ${m.hemmalag} ${m.hemma}–${m.borta} ${m.bortalag} (källa: ${m.källa})`)
      }
    }

    const nya = mappade.filter((r) => !sparade.has(r[0]))

    // ── 6. Spara nya resultat ───────────────────────────────────────────────
    // Kolumner: A=match_id, B=hemma, C=borta, D=vinnare ('H'/'A'/'')
    // D fylls bara i av football-data.org för knockout-matcher där vinnaren
    // kan avgöras via straffar (så att bracket-propagering fungerar korrekt).
    if (nya.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Resultat!A:D',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: nya },
      })
      console.log(`[sync-results] ✅ Sparade ${nya.length} nya resultat`)
    } else {
      console.log('[sync-results] Inga nya resultat')
    }

    // ── 6b. Rätta redan sparade resultat som ändrats (självläkning) ─────────
    // Tidigare skrevs bara NYA rader; ett en gång felskrivet resultat (t.ex. en
    // knockout-match sparad med förlängningsresultat innan 90-min-resultatet
    // fanns) blev då permanent fel. Nu skriver vi över rader vars mål skiljer sig
    // från den aktuella (ordinarie-tids-)beräkningen.
    //
    // Vinnare (kolumn D): en källa utan vinnaruppgift (tom sträng) får ALDRIG
    // nolla en redan känd vinnare — annars skulle D "flappa" fram och tillbaka
    // mellan körningar beroende på vilken källa som svarade (football-data sätter
    // vinnare även för gruppspel, TheSportsDB oftast inte). Vi behåller därför den
    // kända vinnaren och uppdaterar bara D när den nya källan har en (icke-tom)
    // avvikande vinnare.
    const ändrade = []
    for (const rad of mappade) {
      const idx = befintligaRader.findIndex((r) => r[0] === rad[0])
      if (idx === -1) continue // saknas → hanteras som "ny" ovan
      const gammal = befintligaRader[idx]
      const gammalVinnare = String(gammal[3] ?? '')
      const nyVinnare     = String(rad[3] ?? '')
      const slutVinnare   = nyVinnare !== '' ? nyVinnare : gammalVinnare
      const nyRad = [rad[0], String(rad[1] ?? ''), String(rad[2] ?? ''), slutVinnare]

      const skiljerSig =
        String(gammal[1] ?? '') !== nyRad[1] ||
        String(gammal[2] ?? '') !== nyRad[2] ||
        gammalVinnare !== slutVinnare
      if (!skiljerSig) continue
      const rowNum = idx + 2 // A2 = första dataraden
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Resultat!A${rowNum}:D${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [nyRad] },
      })
      console.warn(`[sync-results] 🔧 Rättade ${nyRad[0]}: ${gammal[1]}–${gammal[2]} → ${nyRad[1]}–${nyRad[2]}`)
      befintligaRader[idx] = nyRad
      ändrade.push(nyRad[0])
    }
    if (ändrade.length > 0) {
      console.log(`[sync-results] ✅ Rättade ${ändrade.length} ändrade resultat`)
    }

    const allaResultatRader = [...befintligaRader, ...nya]

    // ── 7. Räkna om snapshots ───────────────────────────────────────────────
    await räknaOmSnapshots(sheets, aktuellaMatcherRader, allaResultatRader)

    // ── 8. Uppdatera skytteligan ────────────────────────────────────────────
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

  // ── Frågesvar-poäng + maxpoäng ──
  // Frågor läses HÄR med kolumn H (fel_svar) — locked-snapshoten stannar vid G,
  // och H uppdateras löpande av admin (t.ex. utslagna spelare i skytteligan).
  // totalMål = gjorda mål hittills ur Resultat-arket (ordinarie tid, samma
  // regel som poängräkningen). snabbaste_målet sätts av admin i Inställningar.
  let frågeSvarPoäng = null
  let maxMap = {}
  try {
    const frågorMedH = await getRows(sheets, 'Frågor!A2:H1000')
    const settings    = await getSettings()
    const snabbasteMål = parseSnabbasteMål(settings['snabbaste_målet'])
    const totalMål = resultatRader.reduce(
      (s, r) => s + (Number(r?.[1]) || 0) + (Number(r?.[2]) || 0), 0)

    const bedömArgs = {
      frågorRader: frågorMedH, frågorSvarRader: frågorSvar,
      matcherRader, resultatRader, snabbasteMål, totalMål,
    }
    frågeSvarPoäng = beräknaFrågeSvarPoäng(bedömArgs)
    maxMap = beräknaMaxPoäng({ ...bedömArgs, standings, tipsRader })
  } catch (err) {
    // Får ALDRIG stoppa topplistan — utan bedömning skrivs bara max/poäng tomt.
    console.error('[sync-results] Kunde inte bedöma frågesvar/maxpoäng:', err.message)
  }

  const uppdaterad = new Date().toISOString()
  await ensureSheet(sheets, TOPPLISTA_SHEET)
  await overwriteRange(sheets, TOPPLISTA_SHEET, [
    TOPPLISTA_HEADER,
    ...standings.map((r) => [
      r.user_id, r.namn, r.poäng, r.exakta, r.rätta, r.frågepoäng, r.plats, uppdaterad,
      maxMap[r.user_id] ?? '',
    ]),
  ])
  await setCached('standings:v1', standings)

  // ── Frågesvar-poäng → FrågorSvar kolumn E ──
  // Samma mönster som Tips kolumn F: frågans poäng vid rätt, 0 när svaret är
  // fel eller uträknat (utslaget lag/spelare, för lågt måltips, för långsam
  // snabbaste mål-tid), tomt när frågan fortfarande är öppen.
  if (frågeSvarPoäng && frågorSvar.length > 0) {
    await writeColumn(sheets, `FrågorSvar!E1:E${frågorSvar.length + 1}`, ['poäng', ...frågeSvarPoäng])
  }

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
 * Uppdaterar lagnamn i knockout-matcher i Matcher-arket när lag kvalificerar sig.
 *
 * Flöde:
 *   1. Hämta knockout-fixtures från openfootball (beräknat ur gruppstälningar)
 *      → returnerar [{ match_id, hemmalag, bortalag }]
 *   2. Slå upp match_id direkt i Matcher-arket (ingen tidsstämpelmatchning)
 *   3. Om lagnamnen skiljer sig → uppdatera kolumn D:E
 *   4. Invalidera locked-snapshot-cachen om något uppdaterades
 *
 * Returnerar true om minst en uppdatering gjordes (cache behöver laddas om).
 */
async function uppdateraKnockoutLagnamn(sheets, matcherRader) {
  // Hämta Resultat-arket inkl. vinnare-kolumn (D) för bracket-propagering
  const resultatRaderMedScores = await getRows(sheets, 'Resultat!A2:D1000')

  let fixtures = []
  try {
    fixtures = await getAllKnockoutFixtures({ matcherRader, resultatRader: resultatRaderMedScores })
  } catch (err) {
    console.warn('[sync-results] uppdateraKnockoutLagnamn: kunde inte hämta fixtures:', err.message)
    return false
  }

  if (fixtures.length === 0) return false

  // Bygg uppslagstabell: match_id → { idx, hemmalag, bortalag }
  const matcherMap = {}
  for (let i = 0; i < matcherRader.length; i++) {
    const rad = matcherRader[i]
    if (rad[0]) matcherMap[rad[0]] = { idx: i, hemmalag: rad[3] || '', bortalag: rad[4] || '' }
  }

  // Platshållare = bracketkoder som "1B", "2H", "3E/F/G/I/J", "W73" — aldrig riktiga lagnamn
  const ärPlaceholder = (namn) =>
    !namn || /^[12][A-L]$/.test(namn) || /^3[A-L]/.test(namn) || /^[WL]\d+$/.test(namn)

  let antalUppdaterade = 0

  for (const fix of fixtures) {
    const befintlig = matcherMap[fix.match_id]
    if (!befintlig) {
      console.warn(`[sync-results] uppdateraKnockoutLagnamn: ${fix.match_id} saknas i Matcher-arket`)
      continue
    }

    const rowNum = befintlig.idx + 2

    // Hemmalag: uppdatera om ny info finns och befintligt värde är platshållare
    const uppdateraH = fix.hemmalag && ärPlaceholder(befintlig.hemmalag) && befintlig.hemmalag !== fix.hemmalag
    // Bortalag: uppdatera om ny info finns och befintligt värde är platshållare
    const uppdateraB = fix.bortalag && ärPlaceholder(befintlig.bortalag) && befintlig.bortalag !== fix.bortalag

    if (!uppdateraH && !uppdateraB) continue

    if (uppdateraH && uppdateraB) {
      // Båda lagen: en enda skrivning
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Matcher!D${rowNum}:E${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[fix.hemmalag, fix.bortalag]] },
      })
      console.log(`[sync-results] ✅ ${fix.match_id}: D="${fix.hemmalag}" E="${fix.bortalag}"`)
    } else if (uppdateraH) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Matcher!D${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[fix.hemmalag]] },
      })
      console.log(`[sync-results] ✅ ${fix.match_id}: D="${befintlig.hemmalag}" → "${fix.hemmalag}" (bortalag väntar)`)
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Matcher!E${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[fix.bortalag]] },
      })
      console.log(`[sync-results] ✅ ${fix.match_id}: E="${befintlig.bortalag}" → "${fix.bortalag}" (hemmalag väntar)`)
    }
    antalUppdaterade++
  }

  if (antalUppdaterade > 0) {
    console.log(`[sync-results] ${antalUppdaterade} knockout-lagnamn uppdaterade — invaliderar locked-snapshot-cache`)
    await refreshLockedSnapshot()
    return true
  }
  return false
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
