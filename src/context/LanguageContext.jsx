/**
 * LanguageContext.jsx
 *
 * Enkel i18n-lösning utan externa beroenden.
 *
 * ANVÄNDNING I KOMPONENTER:
 *   import { useLanguage } from '../context/LanguageContext'
 *   const { t, språk, byttSpråk } = useLanguage()
 *   <h1>{t('leaderboard.title')}</h1>
 *
 * LÄGGA TILL NYA STRÄNGAR:
 *   1. Lägg till nyckeln i sv.js och en.js
 *   2. Använd t('din.nyckel') i komponenten
 *
 * STÖD FÖR INTERPOLERING:
 *   t('home.välkommen', { namn: användare.namn })
 *   → "Välkommen, Anna!" / "Welcome, Anna!"
 *   (Lägg {{namn}} i översättningssträngen)
 */

import { createContext, useContext, useState, useCallback } from 'react'
import sv from '../locales/sv'
import en from '../locales/en'

const texter = { sv, en }

const LanguageContext = createContext()

// Hämta ett djupt nestlat värde ur ett objekt via punkt-notation
// t.ex. get(obj, 'navbar.links.matches') → obj.navbar.links.matches
function get(obj, nyckel) {
  return nyckel.split('.').reduce((o, k) => o?.[k], obj)
}

export function LanguageProvider({ children }) {
  const [språk, setSpråk] = useState(() => {
    // Kom ihåg valt språk mellan sessioner
    return localStorage.getItem('vm_språk') || 'sv'
  })

  function byttSpråk(nyttSpråk) {
    setSpråk(nyttSpråk)
    localStorage.setItem('vm_språk', nyttSpråk)
  }

  // t('nyckel') — hämtar översatt sträng
  // t('nyckel', { variabel: värde }) — med interpolering
  const t = useCallback((nyckel, variabler) => {
    const text = get(texter[språk], nyckel) || get(texter['sv'], nyckel) || nyckel
    if (!variabler) return text
    return Object.entries(variabler).reduce(
      (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v),
      text
    )
  }, [språk])

  return (
    <LanguageContext.Provider value={{ t, språk, byttSpråk }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
