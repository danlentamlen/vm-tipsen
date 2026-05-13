/**
 * tests/unit/useAdmin.test.js
 *
 * Testar useAdmin-hooken — verifierar att:
 *   1. sessionStorage används istället för localStorage
 *   2. Gammal localStorage-post migreras automatiskt
 *   3. Inloggning/utloggning fungerar korrekt
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdmin } from '../../src/hooks/useAdmin.js'

// Mock fetch globalt
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  mockFetch.mockReset()
})

describe('useAdmin — initial state', () => {
  it('är utloggad om ingen admin_secret finns', () => {
    const { result } = renderHook(() => useAdmin())
    expect(result.current.inloggad).toBe(false)
  })

  it('är inloggad om admin_secret finns i sessionStorage', () => {
    sessionStorage.setItem('admin_secret', 'hemligt')
    const { result } = renderHook(() => useAdmin())
    expect(result.current.inloggad).toBe(true)
  })

  it('migrerar admin_secret från localStorage till sessionStorage', () => {
    localStorage.setItem('admin_secret', 'gammal-nyckel')
    const { result } = renderHook(() => useAdmin())

    expect(result.current.inloggad).toBe(true)
    // Ska ligga i sessionStorage efter migrering
    expect(sessionStorage.getItem('admin_secret')).toBe('gammal-nyckel')
    // Ska vara borttagen från localStorage
    expect(localStorage.getItem('admin_secret')).toBeNull()
  })
})

describe('useAdmin — inloggning', () => {
  it('sparar i sessionStorage (INTE localStorage) vid lyckad inloggning', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const { result } = renderHook(() => useAdmin())

    // Sätt lösenord och skicka formuläret
    act(() => { result.current.setLösenord('rätt-lösenord') })
    await act(async () => {
      await result.current.logga_in({ preventDefault: vi.fn() })
    })

    expect(result.current.inloggad).toBe(true)
    expect(sessionStorage.getItem('admin_secret')).toBe('rätt-lösenord')
    // Ska INTE finnas i localStorage
    expect(localStorage.getItem('admin_secret')).toBeNull()
  })

  it('sätter felmeddelande vid felaktigt lösenord', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Ej behörig' }) })

    const { result } = renderHook(() => useAdmin())
    act(() => { result.current.setLösenord('fel-lösenord') })
    await act(async () => {
      await result.current.logga_in({ preventDefault: vi.fn() })
    })

    expect(result.current.inloggad).toBe(false)
    expect(result.current.fel).toBe('Fel lösenord')
    expect(sessionStorage.getItem('admin_secret')).toBeNull()
  })
})

describe('useAdmin — utloggning', () => {
  it('rensar sessionStorage och återställer state vid utloggning', () => {
    sessionStorage.setItem('admin_secret', 'hemligt')
    const { result } = renderHook(() => useAdmin())

    expect(result.current.inloggad).toBe(true)
    act(() => { result.current.logga_ut() })

    expect(result.current.inloggad).toBe(false)
    expect(sessionStorage.getItem('admin_secret')).toBeNull()
  })
})
