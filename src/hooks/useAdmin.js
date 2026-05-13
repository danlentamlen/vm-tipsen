/**
 * useAdmin.js
 *
 * Extraherar all admin-state och logik från Admin.jsx till en
 * återanvändbar hook. Gör komponenten renare och lättare att testa.
 *
 * SÄKERHETSFÖRBÄTTRING:
 *   - Admin-hemligheten lagras i sessionStorage istället för localStorage.
 *   - sessionStorage rensas automatiskt när webbläsarfliken stängs.
 *   - localStorage lever kvar tills användaren manuellt rensar den —
 *     det ökar risken om en XSS-attack läcker innehållet.
 *
 * Migrering: Om användaren har en gammal admin_secret i localStorage
 * migreras den automatiskt till sessionStorage och tas bort från localStorage.
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'admin_secret'

function hämtaAdminSecret() {
  // Kolla sessionStorage först
  const session = sessionStorage.getItem(STORAGE_KEY)
  if (session) return session

  // Migrera eventuell gammal nyckel från localStorage
  const local = localStorage.getItem(STORAGE_KEY)
  if (local) {
    sessionStorage.setItem(STORAGE_KEY, local)
    localStorage.removeItem(STORAGE_KEY)
    console.info('[useAdmin] Migrerade admin_secret från localStorage → sessionStorage')
    return local
  }

  return null
}

export function useAdmin() {
  const [lösenord, setLösenord]           = useState('')
  const [inloggad, setInloggad]           = useState(() => !!hämtaAdminSecret())
  const [adminSecret, setAdminSecret]     = useState(() => hämtaAdminSecret())
  const [fel, setFel]                     = useState(null)
  const [settings, setSettings]           = useState(null)
  const [viner, setViner]                 = useState([])
  const [pendingStatus, setPendingStatus] = useState({})
  const [sparar, setSparar]               = useState(null)
  const [sänderMail, setSänderMail]       = useState(null)
  const [toast, setToast]                 = useState(null)
  const [laddar, setLaddar]               = useState(false)

  // ── Toast-hjälpare ────────────────────────────────────────
  const visaToast = useCallback((text, ms = 3000) => {
    setToast(text)
    setTimeout(() => setToast(null), ms)
  }, [])

  // ── Hämta data när inloggad ───────────────────────────────
  useEffect(() => {
    if (inloggad && adminSecret) {
      hämtaSettings()
      hämtaViner()
    }
  }, [inloggad, adminSecret])

  // ── Inloggning ────────────────────────────────────────────
  async function logga_in(e) {
    e.preventDefault()
    setFel(null)
    setLaddar(true)
    try {
      const res = await fetch('/.netlify/functions/admin', {
        headers: { Authorization: `Bearer ${lösenord}` },
      })
      if (res.ok) {
        // Använd sessionStorage — rensas när fliken stängs
        sessionStorage.setItem(STORAGE_KEY, lösenord)
        setAdminSecret(lösenord)
        setInloggad(true)
        setLösenord('')
      } else {
        setFel('Fel lösenord')
      }
    } catch {
      setFel('Kunde inte ansluta till servern')
    } finally {
      setLaddar(false)
    }
  }

  // ── Utloggning ────────────────────────────────────────────
  function logga_ut() {
    sessionStorage.removeItem(STORAGE_KEY)
    setInloggad(false)
    setAdminSecret(null)
    setSettings(null)
    setViner([])
  }

  // ── Hämta inställningar ───────────────────────────────────
  async function hämtaSettings() {
    try {
      const res = await fetch('/.netlify/functions/admin', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      })
      if (res.status === 401) {
        // Token har blivit ogiltig — logga ut
        logga_ut()
        return
      }
      const data = await res.json()
      setSettings(data)
    } catch (err) {
      console.error('[useAdmin] Kunde inte hämta settings:', err)
    }
  }

  // ── Hämta vinlista ────────────────────────────────────────
  async function hämtaViner() {
    try {
      const res  = await fetch('/.netlify/functions/viner-hamta')
      const data = await res.json()
      setViner(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[useAdmin] Kunde inte hämta viner:', err)
    }
  }

  // ── Toggla tipslåset ─────────────────────────────────────
  async function toggleLås() {
    const nyttVärde = settings?.tips_låst === 'true' ? 'false' : 'true'
    try {
      await fetch('/.netlify/functions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ nyckel: 'tips_låst', värde: nyttVärde }),
      })
      visaToast(nyttVärde === 'true' ? '🔒 Tips låsta!' : '🔓 Tips upplåsta!')
      await hämtaSettings()
    } catch (err) {
      console.error('[useAdmin] toggleLås fel:', err)
      visaToast('❌ Kunde inte ändra lås-status')
    }
  }

  // ── Spara betalningsstatus ────────────────────────────────
  async function sparaStatus(user_id) {
    const status = pendingStatus[user_id]
    if (!status) return
    setSparar(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-betalning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ user_id, status }),
      })
      if (res.ok) {
        if (status === 'återbetald') {
          setViner((prev) => prev.filter((v) => v.user_id !== user_id))
        } else {
          setViner((prev) =>
            prev.map((v) => (v.user_id === user_id ? { ...v, betalt: status } : v))
          )
        }
        setPendingStatus((prev) => {
          const kopia = { ...prev }
          delete kopia[user_id]
          return kopia
        })
        visaToast('✅ Status sparad')
      } else {
        visaToast('❌ Kunde inte spara status')
      }
    } catch (err) {
      console.error('[useAdmin] sparaStatus fel:', err)
      visaToast('❌ Serverfel')
    } finally {
      setSparar(null)
    }
  }

  // ── Skicka kvittomail ─────────────────────────────────────
  async function skickaKvitto(user_id, status) {
    setSänderMail(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-kvitto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ user_id, status }),
      })
      const data = await res.json()
      visaToast(res.ok ? `📧 ${data.message}` : `❌ ${data.error}`)
    } catch (err) {
      console.error('[useAdmin] skickaKvitto fel:', err)
      visaToast('❌ Kunde inte skicka mail')
    } finally {
      setSänderMail(null)
    }
  }

  return {
    // State
    lösenord, setLösenord,
    inloggad,
    fel,
    settings,
    viner,
    pendingStatus, setPendingStatus,
    sparar,
    sänderMail,
    toast,
    laddar,
    // Actions
    logga_in,
    logga_ut,
    toggleLås,
    sparaStatus,
    skickaKvitto,
    hämtaSettings,
    hämtaViner,
  }
}
