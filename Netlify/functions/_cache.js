/**
 * Simple in-memory TTL cache for Netlify function instances.
 *
 * Each function has its own isolated Node.js process, so this cache is
 * per-function but shared across warm requests to the same instance.
 * Typical Netlify warm window: several minutes of idle before cold-start.
 *
 * Usage:
 *   import { withCache } from './_cache.js'
 *   const data = await withCache('my-key', 2 * 60 * 1000, () => expensiveFetch())
 */

const store = new Map()

/**
 * @param {string} key      - Cache key
 * @param {number} ttlMs    - Time-to-live in milliseconds
 * @param {() => Promise<any>} fn - Async function that produces the value
 * @returns {Promise<any>}
 */
export async function withCache(key, ttlMs, fn) {
  const entry = store.get(key)
  if (entry && Date.now() - entry.ts < ttlMs) {
    return entry.data
  }
  const data = await fn()
  store.set(key, { data, ts: Date.now() })
  return data
}

/**
 * Manually invalidate a cache entry (e.g. after a write).
 */
export function invalidate(key) {
  store.delete(key)
}

/**
 * Clear all cached entries (useful for testing).
 */
export function clearAll() {
  store.clear()
}
