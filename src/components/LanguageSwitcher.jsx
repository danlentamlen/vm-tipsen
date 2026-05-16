/**
 * LanguageSwitcher.jsx
 *
 * Liten knapp med flaggor som växlar mellan sv/en.
 * Placeras i Navbar — importeras och läggs in bredvid "Logga ut".
 *
 * Användning:
 *   import LanguageSwitcher from './LanguageSwitcher'
 *   <LanguageSwitcher />
 */
import { useLanguage } from '../context/LanguageContext'

export default function LanguageSwitcher({ mobile = false }) {
  const { språk, byttSpråk } = useLanguage()

  const stilBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 100,
    padding: '3px 4px',
    cursor: 'pointer',
  }

  const stilKnapp = (aktiv) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: mobile ? 32 : 26,
    height: mobile ? 32 : 26,
    borderRadius: '50%',
    border: 'none',
    background: aktiv ? 'rgba(197,160,40,0.25)' : 'transparent',
    outline: aktiv ? '1.5px solid rgba(197,160,40,0.6)' : 'none',
    cursor: 'pointer',
    fontSize: mobile ? 18 : 14,
    transition: 'all 0.15s',
    lineHeight: 1,
  })

  return (
    <div style={stilBase} title={språk === 'sv' ? 'Switch to English' : 'Byt till svenska'}>
      <button
        onClick={() => byttSpråk('sv')}
        style={stilKnapp(språk === 'sv')}
        aria-label="Svenska"
        aria-pressed={språk === 'sv'}
      >
        🇸🇪
      </button>
      <button
        onClick={() => byttSpråk('en')}
        style={stilKnapp(språk === 'en')}
        aria-label="English"
        aria-pressed={språk === 'en'}
      >
        🇬🇧
      </button>
    </div>
  )
}
