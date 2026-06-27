/**
 * _lockedData.js — Cachad åtkomst till de LÅSTA arken.
 *
 * Arken Användare, Viner, Frågor och FrågorSvar uppdateras inte längre
 * (registrering stängd). De serveras ur persistent cache (Blobs) i upp till ett
 * dygn för att minimera Sheets-trafik.
 *
 * OBS: Matcher ingår INTE längre i den låsta snapshoten. Under slutspelet
 * uppdateras lagnamnen löpande när lag kvalificerar sig. getMatcher() läser
 * därför med en kort TTL (5 min) så att ändringar i sheetet syns snabbt.
 *
 * OBS: Tips ingår INTE här — det kan fortfarande växa för slutspelsmatcher och
 * läses därför separat (kortare TTL) där det behövs.
 */
import { getSheets, getMultipleRanges, getRows } from './_sheets.js'
import { getCached, invalidate } from './_persistentCache.js'

// ── Låst snapshot (Användare, Viner, Frågor, FrågorSvar) ──────────────────
const LOCKED_KEY = 'locked-snapshot:v2'
const LOCKED_TTL = 24 * 60 * 60 * 1000 // 24h — dessa ark ändras ej

const LOCKED_RANGES = [
  'Användare!A2:F1000',
  'Viner!A2:G1000',
  'Frågor!A2:G1000',
  'FrågorSvar!A2:D100000',
]

/**
 * @returns {Promise<{användare:Array[],viner:Array[],frågor:Array[],frågorSvar:Array[]}>}
 */
export async function getLockedSnapshot() {
  return getCached(LOCKED_KEY, LOCKED_TTL, async () => {
    const sheets = await getSheets()
    const [användare, viner, frågor, frågorSvar] =
      await getMultipleRanges(sheets, LOCKED_RANGES)
    return { användare, viner, frågor, frågorSvar }
  })
}

// ── Matcher — kort TTL för att fånga upp slutspels-uppdateringar ──────────
const MATCHER_KEY = 'matcher:v1'
const MATCHER_TTL = 5 * 60 * 1000 // 5 min — lagnamn uppdateras löpande i slutspelet

/**
 * Läser Matcher-sheetet med kort cache. Ändringar i sheetet syns inom 5 min.
 */
export async function getMatcher() {
  return getCached(MATCHER_KEY, MATCHER_TTL, async () => {
    const sheets = await getSheets()
    return getRows(sheets, 'Matcher!A2:H1000')
  })
}

// Bekvämlighetsgetters
export async function getAnvändare()   { return (await getLockedSnapshot()).användare }
export async function getViner()       { return (await getLockedSnapshot()).viner }
export async function getFrågor()      { return (await getLockedSnapshot()).frågor }
export async function getFrågorSvar()  { return (await getLockedSnapshot()).frågorSvar }

/** Tvinga omläsning av låsta ark (om något mot förmodan ändras). */
export async function refreshLockedSnapshot() {
  await invalidate(LOCKED_KEY)
  return getLockedSnapshot()
}

/** Tvinga omläsning av Matcher (kan anropas från admin-endpoint). */
export async function refreshMatcher() {
  await invalidate(MATCHER_KEY)
  return getMatcher()
}
