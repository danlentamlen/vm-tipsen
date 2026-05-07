import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * RekryteringsBanner — kompakt info-rad
 *
 * Placera i Home.jsx:
 *   import RekryteringsBanner from '../components/RekryteringsBanner'
 *
 * För inloggade — inuti welcome-section, efter quick-links:
 *   <RekryteringsBanner />
 *
 * För ej inloggade — i how-section, efter steps-grid:
 *   <RekryteringsBanner />
 */
export default function RekryteringsBanner() {
  const { användare } = useAuth()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      background: 'rgba(197,160,40,0.08)',
      border: '1px solid rgba(197,160,40,0.25)',
      borderLeft: '3px solid #C5A028',
      borderRadius: 10,
      padding: '0.875rem 1.1rem',
      marginTop: '1.5rem',
      maxWidth: 680,
      width: '100%',
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>🍷</span>
      <div>
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7a5c10',
          marginBottom: '0.25rem',
        }}>
          Nyhet — Rekrytera och vinn ett pris
        </p>
        <p style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '0.85rem',
          color: '#8a6e1a',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Varje ny deltagare kan ange vem som rekryterade dem till tävlingen. Den som värvar flest vinner ett extra pris! Redan registrerad? Gå till{' '}
          <Link
            to="/mitt-vin"
            style={{ color: '#7a5c10', fontWeight: 600, textDecoration: 'underline' }}
          >
            Min vinflaska
          </Link>{' '}
          för att ange din rekryterare.
        </p>
      </div>
    </div>
  )
}