/**
 * _rateLimiter.js
 *
 * Enkel in-memory rate limiter för Netlify Functions.
 * Syftet är att skydda auth-endpoints mot brute-force-attacker.
 *
 * OBS: In-memory = delar inte state mellan Lambda-instanser.
 * För produktionsnivå bör detta ersättas med Netlify KV eller Redis.
 * För ett privat tipsningsspel med ~50 deltagare räcker detta gott.
 *
 * Användning:
 *   import { checkRateLimit } from './_rateLimiter.js'
 *
 *   const limitResult = checkRateLimit(ip)
 *   if (limitResult.blocked) {
 *     return new Response(JSON.stringify({ error: limitResult.message }), {
 *       status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(limitResult.retryAfter) }
 *     })
 *   }
 */

// Map: ip -> { count, firstAttempt, blockedUntil }
const attempts = new Map()

const MAX_ATTEMPTS   = 5         // Max misslyckade försök
const WINDOW_MS      = 15 * 60 * 1000  // 15 minuter fönster
const BLOCK_DURATION = 15 * 60 * 1000  // Blockera i 15 min

/**
 * Hämta IP från Netlify request (stöder både IPv4 och IPv6).
 */
export function getClientIP(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('client-ip') ||
    'unknown'
  )
}

/**
 * Kontrollera om IP är rate-limitad.
 * @param {string} ip
 * @returns {{ blocked: boolean, message?: string, retryAfter?: number }}
 */
export function checkRateLimit(ip) {
  const now = Date.now()
  const data = attempts.get(ip)

  // Om IP är blockerad — kontrollera om blocktiden gått ut
  if (data?.blockedUntil) {
    if (now < data.blockedUntil) {
      const retryAfter = Math.ceil((data.blockedUntil - now) / 1000)
      return {
        blocked: true,
        message: `För många misslyckade inloggningsförsök. Försök igen om ${Math.ceil(retryAfter / 60)} minuter.`,
        retryAfter,
      }
    }
    // Blocktiden passerad — nollställ
    attempts.delete(ip)
  }

  // Rensa gamla försök utanför fönstret
  if (data && now - data.firstAttempt > WINDOW_MS) {
    attempts.delete(ip)
  }

  return { blocked: false }
}

/**
 * Registrera ett misslyckat inloggningsförsök.
 * @param {string} ip
 */
export function recordFailedAttempt(ip) {
  const now  = Date.now()
  const data = attempts.get(ip)

  if (!data) {
    attempts.set(ip, { count: 1, firstAttempt: now, blockedUntil: null })
    return
  }

  data.count += 1

  if (data.count >= MAX_ATTEMPTS) {
    data.blockedUntil = now + BLOCK_DURATION
    console.warn(`[rateLimiter] IP ${ip} blockerad efter ${data.count} misslyckade försök`)
  }

  attempts.set(ip, data)
}

/**
 * Nollställ räknaren för en IP (vid lyckad inloggning).
 * @param {string} ip
 */
export function resetAttempts(ip) {
  attempts.delete(ip)
}

/**
 * Städa bort gamla poster (anropa periodiskt om nödvändigt).
 */
export function pruneOldEntries() {
  const now = Date.now()
  for (const [ip, data] of attempts.entries()) {
    const expired = !data.blockedUntil && now - data.firstAttempt > WINDOW_MS
    const blockExpired = data.blockedUntil && now > data.blockedUntil
    if (expired || blockExpired) attempts.delete(ip)
  }
}
