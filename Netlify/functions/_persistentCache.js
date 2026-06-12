/**
 * _persistentCache.js — Cache som överlever cold starts.
 *
 * Problemet med _cache.js (ren in-memory Map) är att varje Netlify-funktion
 * kör i sin egen process. Vid en cold start är cachen tom och vi tvingas läsa
 * tunga ranges (t.ex. Tips!A2:E100000) från Google Sheets igen. Under hög last
 * snurras många kalla instanser upp → sidan blir långsam.
 *
 * Den här modulen lägger ett PERSISTENT lager (Netlify Blobs) ovanpå in-memory.
 * Blobs delas mellan alla instanser och överlever cold starts, så en kall
 * instans kan läsa ett färdigt JSON-blob i stället för att slå mot Sheets.
 *
 * Säker fallback: om @netlify/blobs inte är installerat eller Blobs inte är
 * tillgängligt (t.ex. lokalt) degraderar modulen tyst till samma beteende som
 * gamla in-memory-cachen. Inget kan alltså sluta fungera p.g.a. den här filen.
 *
 * Kräver (i produktion):  npm install @netlify/blobs
 */

const memory = new Map() // key → { data, ts }
const STORE_NAME = 'vmtipsen-cache'

let _storePromise // lazy, cachad mellan anrop
async function getStore() {
  if (_storePromise !== undefined) return _storePromise
  _storePromise = (async () => {
    try {
      const mod = await import('@netlify/blobs')
      // Netlify injicerar context automatiskt i funktioner; getStore(name) räcker.
      return mod.getStore(STORE_NAME)
    } catch {
      return null // paket saknas eller ingen Blobs-kontext → fallback
    }
  })()
  return _storePromise
}

/**
 * Read-through cache med persistent lager.
 *
 * @param {string} key                 unik nyckel
 * @param {number} ttlMs               time-to-live i ms
 * @param {() => Promise<any>} producer producerar värdet vid miss
 * @returns {Promise<any>}
 */
export async function getCached(key, ttlMs, producer) {
  const now = Date.now()

  // 1) In-memory (snabbast)
  const mem = memory.get(key)
  if (mem && now - mem.ts < ttlMs) return mem.data

  // 2) Persistent (Blobs)
  const store = await getStore()
  if (store) {
    try {
      const blob = await store.get(key, { type: 'json' })
      if (blob && typeof blob.ts === 'number' && now - blob.ts < ttlMs) {
        memory.set(key, { data: blob.data, ts: blob.ts })
        return blob.data
      }
    } catch { /* fortsätt till producer */ }
  }

  // 3) Miss → producera och skriv tillbaka i båda lagren
  const data = await producer()
  const entry = { data, ts: now }
  memory.set(key, entry)
  if (store) {
    try { await store.setJSON(key, entry) } catch { /* best effort */ }
  }
  return data
}

/** Skriv ett värde direkt (t.ex. från en scheduled writer som just räknat om). */
export async function setCached(key, data) {
  const entry = { data, ts: Date.now() }
  memory.set(key, entry)
  const store = await getStore()
  if (store) {
    try { await store.setJSON(key, entry) } catch { /* best effort */ }
  }
}

/** Invalidera en nyckel i båda lagren. */
export async function invalidate(key) {
  memory.delete(key)
  const store = await getStore()
  if (store) {
    try { await store.delete(key) } catch { /* best effort */ }
  }
}
