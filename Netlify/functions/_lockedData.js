/**
 * _lockedData.js — Cachad åtkomst till de LÅSTA arken.
 *
 * Arken Matcher, Användare, Viner, Frågor och FrågorSvar uppdateras inte längre
 * (registrering stängd). De behöver alltså bara läsas EN gång och kan sedan
 * serveras ur persistent cache (Blobs) i upp till ett dygn. Det tar bort
 * merparten av Sheets-trafiken som gjorde sidan långsam.
 *
 * OBS: Tips ingår INTE här — det kan fortfarande växa för slutspelsmatcher och
 * läses därför separat (kortare TTL) där det behövs.
 */
import { getSheets, getMultipleRanges } from './_sheets.js'
import { getCached, invalidate } from './_persistentCache.js'

const KEY = 'locked-snapshot:v1'
const TTL = 24 * 60 * 60 * 1000 // 24h — arken är låsta

const RANGES = [
  'Matcher!A2:H1000',
  'Användare!A2:F1000',
  'Viner!A2:G1000',
  'Frågor!A2:G1000',
  'FrågorSvar!A2:D100000',
]

/**
 * @returns {Promise<{matcher:Array[],användare:Array[],viner:Array[],frågor:Array[],frågorSvar:Array[]}>}
 */
export async function getLockedSnapshot() {
  return getCached(KEY, TTL, async () => {
    const sheets = await getSheets()
    const [matcher, användare, viner, frågor, frågorSvar] =
      await getMultipleRanges(sheets, RANGES)
    return { matcher, användare, viner, frågor, frågorSvar }
  })
}

// Bekvämlighetsgetters (samma cachade snapshot, ett enda Sheets-anrop totalt)
export async function getMatcher()     { return (await getLockedSnapshot()).matcher }
export async function getAnvändare()   { return (await getLockedSnapshot()).användare }
export async function getViner()       { return (await getLockedSnapshot()).viner }
export async function getFrågor()      { return (await getLockedSnapshot()).frågor }
export async function getFrågorSvar()  { return (await getLockedSnapshot()).frågorSvar }

/** Tvinga omläsning (om något mot förmodan ändras i ett låst ark). */
export async function refreshLockedSnapshot() {
  await invalidate(KEY)
  return getLockedSnapshot()
}
