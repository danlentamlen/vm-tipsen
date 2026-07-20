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
  // Test-söm: injicera en mock-store via globalThis (produktion sätter aldrig detta).
  if (globalThis.__TEST_BLOB_STORE__) return globalThis.__TEST_BLOB_STORE__
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

// ── Korsinstans-invalidering ────────────────────────────────────────────────
// Varje funktion (participants, topplista, sync-results …) kör i sin EGEN process
// med sin egen `memory`-Map. invalidate() i en instans kan inte rensa en annan
// instans minne. Lösning: en delad markör i Blobs (`__invalidations__`) som mappar
// nyckel → senaste invaliderings-tidpunkt. getCached litar bara på en minnескopia
// som är NYARE än markören. Markören pollas per instans max var INVAL_POLL_MS
// (billigt) → en tömning slår igenom överallt inom den fördröjningen.
const INVAL_KEY = '__invalidations__'
// Poll-intervall per instans. Överbryggbart i test via env (produktion sätter ej).
const INVAL_POLL_MS = Number(process.env.CACHE_INVAL_POLL_MS) >= 0
  ? Number(process.env.CACHE_INVAL_POLL_MS)
  : 30 * 1000

let _inval = { map: {}, ts: 0 } // per-instans cache av invaliderings-markörerna

async function hämtaInvalideringar(store) {
  const now = Date.now()
  if (now - _inval.ts < INVAL_POLL_MS) return _inval.map
  if (!store) { _inval = { map: _inval.map, ts: now }; return _inval.map }
  try {
    const blob = await store.get(INVAL_KEY, { type: 'json' })
    _inval = { map: (blob && blob.data) || {}, ts: now }
  } catch {
    _inval = { map: _inval.map, ts: now } // behåll senast kända vid läsfel
  }
  return _inval.map
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
  const store = await getStore()

  // Invaliderings-markör: en kopia som cachades FÖRE denna tidpunkt är inaktuell.
  const invTs = (await hämtaInvalideringar(store))[key] || 0

  // 1) In-memory (snabbast) — men bara om den cachades VID/EFTER senaste invalidering
  const mem = memory.get(key)
  if (mem && now - mem.ts < ttlMs && mem.ts >= invTs) return mem.data

  // 2) Persistent (Blobs)
  if (store) {
    try {
      const blob = await store.get(key, { type: 'json' })
      if (blob && typeof blob.ts === 'number' && now - blob.ts < ttlMs && blob.ts >= invTs) {
        memory.set(key, { data: blob.data, ts: blob.ts })
        return blob.data
      }
    } catch { /* fortsätt till producer */ }
  }

  // 3) Miss → producera och skriv tillbaka i båda lagren.
  // ts sätts strikt > senaste invalidering så att data som produceras SOM SVAR på
  // en invalidering alltid räknas som färsk (undviker ms-kollision mot markören).
  const data = await producer()
  const entry = { data, ts: Math.max(now, invTs + 1) }
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

/**
 * Invalidera en nyckel i alla lager OCH i alla andra funktionsinstanser.
 * Utöver att rensa lokalt minne + Blobs-datan skrivs en delad markör
 * (`__invalidations__`) så att andra processer släpper sina minnескopior nästa
 * gång de pollar (inom INVAL_POLL_MS). Utan markören skulle en varm instans
 * fortsätta servera gammal data i upp till dess TTL (t.ex. 24h för låsta ark).
 */
export async function invalidate(key) {
  const nu = Date.now()
  memory.delete(key)
  _inval.map[key] = nu // egen instans ser invalideringen direkt
  const store = await getStore()
  if (store) {
    try { await store.delete(key) } catch { /* best effort */ }
    try {
      const blob = await store.get(INVAL_KEY, { type: 'json' })
      const map = (blob && blob.data) || {}
      map[key] = nu
      await store.setJSON(INVAL_KEY, { data: map, ts: nu })
    } catch { /* best effort — degraderar till gammalt beteende */ }
  }
}
