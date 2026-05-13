/**
 * tests/unit/rateLimiter.test.js
 *
 * Testar rate-limiting-modulen — det kritiskaste säkerhetslagret.
 * Kör med:  npm test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '../../Netlify/functions/_rateLimiter.js'

// Hjälpfunktion — nollställ state mellan tester
// (modulen håller state i en Map utanför funktionerna)
function rensaState() {
  resetAttempts('test-ip')
  resetAttempts('annan-ip')
}

describe('checkRateLimit', () => {
  beforeEach(rensaState)

  it('tillåter en ny IP utan historik', () => {
    const result = checkRateLimit('test-ip')
    expect(result.blocked).toBe(false)
  })

  it('tillåter IP med färre än 5 misslyckade försök', () => {
    recordFailedAttempt('test-ip')
    recordFailedAttempt('test-ip')
    recordFailedAttempt('test-ip')
    const result = checkRateLimit('test-ip')
    expect(result.blocked).toBe(false)
  })

  it('blockerar IP efter 5 misslyckade försök', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('test-ip')
    const result = checkRateLimit('test-ip')
    expect(result.blocked).toBe(true)
    expect(result.message).toMatch(/försök igen om/i)
    expect(typeof result.retryAfter).toBe('number')
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('blockerar INTE en annan IP när en annan är blockerad', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('test-ip')
    const result = checkRateLimit('annan-ip')
    expect(result.blocked).toBe(false)
  })
})

describe('resetAttempts', () => {
  beforeEach(rensaState)

  it('nollställer räknaren så IP kan logga in igen', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('test-ip')
    expect(checkRateLimit('test-ip').blocked).toBe(true)

    resetAttempts('test-ip')
    expect(checkRateLimit('test-ip').blocked).toBe(false)
  })
})

describe('tidsgränser', () => {
  beforeEach(rensaState)

  it('blockering upphör när blockeringstiden passerat', () => {
    // Simulera att blockeringstiden redan har passerat
    // genom att mocka Date.now()
    const nu = Date.now()
    const tjugoMinSen = nu + 20 * 60 * 1000

    for (let i = 0; i < 5; i++) recordFailedAttempt('test-ip')
    expect(checkRateLimit('test-ip').blocked).toBe(true)

    // Hoppa fram i tid
    vi.spyOn(Date, 'now').mockReturnValue(tjugoMinSen)
    const result = checkRateLimit('test-ip')
    expect(result.blocked).toBe(false)

    vi.restoreAllMocks()
  })
})
