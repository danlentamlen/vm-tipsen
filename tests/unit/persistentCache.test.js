/**
 * tests/unit/persistentCache.test.js
 *
 * Tester för korsinstans-invalidering i _persistentCache.js.
 *
 * Bakgrund: varje Netlify-funktion kör i egen process med egen in-memory-Map.
 * invalidate() i EN instans måste släppa gammal data även i ANDRA instanser,
 * annars fortsätter en varm funktion servera inaktuellt facit tills dess TTL.
 *
 * Vi simulerar två instanser genom att importera modulen två gånger (olika
 * query-sträng → separata modul-instanser med varsin `memory`), medan de delar
 * EN mock-Blobs-store via globalThis.__TEST_BLOB_STORE__.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Enkel mock av Netlify Blobs-store (delad mellan "instanser").
function makeStore() {
  const data = new Map()
  return {
    _data: data,
    async get(key) { return data.has(key) ? data.get(key) : null },
    async setJSON(key, val) { data.set(key, val) },
    async delete(key) { data.delete(key) },
  }
}

let n = 0
async function laddaInstans() {
  // Unik query → fräsch modul-instans (egen `memory`/`_inval`), delad store.
  return import(`../../Netlify/functions/_persistentCache.js?i=${n++}`)
}

beforeEach(() => {
  process.env.CACHE_INVAL_POLL_MS = '0' // pollar markören varje anrop → deterministiskt
  globalThis.__TEST_BLOB_STORE__ = makeStore()
})

afterEach(() => {
  delete globalThis.__TEST_BLOB_STORE__
  delete process.env.CACHE_INVAL_POLL_MS
})

describe('getCached', () => {
  it('cachar värdet och kör inte producern igen', async () => {
    const A = await laddaInstans()
    let körd = 0
    const prod = async () => { körd++; return 'v1' }
    expect(await A.getCached('k', 10_000, prod)).toBe('v1')
    expect(await A.getCached('k', 10_000, prod)).toBe('v1')
    expect(körd).toBe(1)
  })
})

describe('invalidate — korsinstans', () => {
  it('släpper gammal minnескopia i EN ANNAN instans efter invalidering', async () => {
    const A = await laddaInstans()
    const B = await laddaInstans()

    // Båda instanser cachar v1 (A producerar → blob; B läser blob).
    expect(await A.getCached('facit', 24 * 3600_000, async () => 'v1')).toBe('v1')
    expect(await B.getCached('facit', 24 * 3600_000, async () => 'BORDE_EJ_KÖRAS')).toBe('v1')

    // Liten fördröjning: invalidering sker EFTER att kopiorna cachades (som i verkligheten).
    await new Promise((r) => setTimeout(r, 3))

    // A invaliderar och producerar v2.
    await A.invalidate('facit')
    expect(await A.getCached('facit', 24 * 3600_000, async () => 'v2')).toBe('v2')

    // B (annan process, varm minnескopia = v1) MÅSTE nu se v2, inte gammalt v1.
    const bVärde = await B.getCached('facit', 24 * 3600_000, async () => 'v2-fallback')
    expect(bVärde).toBe('v2')
  })

  it('lokal instans ser invalidering direkt (producern körs igen)', async () => {
    const A = await laddaInstans()
    let körd = 0
    const prod = async () => { körd++; return `v${körd}` }
    expect(await A.getCached('k', 24 * 3600_000, prod)).toBe('v1')
    await A.invalidate('k')
    expect(await A.getCached('k', 24 * 3600_000, prod)).toBe('v2')
    expect(körd).toBe(2)
  })
})

describe('fallback utan Blobs-store', () => {
  it('degraderar till ren in-memory (invalidate rensar lokalt)', async () => {
    delete globalThis.__TEST_BLOB_STORE__ // ingen store → getStore() → null i sandbox
    const A = await laddaInstans()
    let körd = 0
    const prod = async () => { körd++; return `v${körd}` }
    expect(await A.getCached('k', 24 * 3600_000, prod)).toBe('v1')
    expect(await A.getCached('k', 24 * 3600_000, prod)).toBe('v1') // cache-träff
    await A.invalidate('k')
    expect(await A.getCached('k', 24 * 3600_000, prod)).toBe('v2') // producern igen
  })
})
