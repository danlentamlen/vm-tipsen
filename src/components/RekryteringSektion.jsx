import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * RekryteringSektion
 * Lägg till i MinVin.jsx:
 *   import RekryteringSektion from '../components/RekryteringSektion'
 *   ...och <RekryteringSektion /> efter formulär-sektionen
 */
export default function RekryteringSektion() {
  const { användare } = useAuth()
  const [rekryteradAv, setRekryteradAv] = useState(null)   // user_id för rekryteraren
  const [rekryterareNamn, setRekryterareNamn] = useState(null)
  const [vald, setVald] = useState(false)                  // redan sparat — låst
  const [valtVal, setValtVal] = useState('')
  const [deltagare, setDeltagare] = useState([])
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(false)
  const [fel, setFel] = useState(null)

  useEffect(() => {
    async function hämta() {
      try {
        const res = await fetch('/.netlify/functions/participants')
        const data = await res.json()
        if (!Array.isArray(data)) return

        setDeltagare(data)

        // Hitta inloggad användares rekryterare
        const jag = data.find(d => d.user_id === användare?.user_id)
        if (jag?.rekryterad_av) {
          setRekryteradAv(jag.rekryterad_av)
          const rekryterare = data.find(d => d.user_id === jag.rekryterad_av)
          setRekryterareNamn(rekryterare?.namn || 'Okänd')
          setVald(true)
        }
      } catch (err) {
        console.error('[RekryteringSektion]', err)
      } finally {
        setLaddar(false)
      }
    }
    if (användare) hämta()
  }, [användare])

  async function hanteraSpara(e) {
    e.preventDefault()
    if (!valtVal) return
    setSparar(true)
    setFel(null)
    try {
      const res = await fetch('/.netlify/functions/rekryterad-spara', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${användare.token}`,
        },
        body: JSON.stringify({ rekryterad_av: valtVal }),
      })
      const data = await res.json()
      if (res.ok) {
        const rekryterare = deltagare.find(d => d.user_id === valtVal)
        setRekryteradAv(valtVal)
        setRekryterareNamn(rekryterare?.namn || 'Okänd')
        setVald(true)
      } else {
        setFel(data.error || 'Något gick fel')
      }
    } catch {
      setFel('Kunde inte spara, försök igen')
    } finally {
      setSparar(false)
    }
  }

  // Filtrera bort sig själv
  const valbara = deltagare.filter(d => d.user_id !== användare?.user_id)

  if (laddar) return null

  return (
    <div style={{
      marginTop: '1.5rem',
      background: '#fff',
      border: '1px solid rgba(0,0,0,.07)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>
      <p style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '.78rem', fontWeight: 700,
        letterSpacing: '.14em', textTransform: 'uppercase',
        color: '#0a1628', marginBottom: '.875rem',
      }}>
        🍷 Rekrytering
      </p>

      {vald ? (
        /* ── Låst — redan valt ── */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(197,160,40,.06)',
          border: '1px solid rgba(197,160,40,.2)',
          borderRadius: 9, padding: '.875rem 1rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <div>
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '.88rem', fontWeight: 600, color: '#0a1628', margin: 0,
            }}>
              Rekryterad av {rekryterareNamn}
            </p>
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '.73rem', color: '#888', margin: '2px 0 0',
            }}>
              Detta val är låst och kan inte ändras.
            </p>
          </div>
        </div>
      ) : (
        /* ── Formulär ── */
        <>
          <p style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: '.82rem', color: '#888', lineHeight: 1.55, marginBottom: '.875rem',
          }}>
            Vem rekryterade dig till VM-tipsen? Den som värvar flest deltagare vinner en extra vinflaska. Välj en gång — kan inte ändras senare.
          </p>

          {fel && (
            <div style={{
              display: 'flex', gap: 8,
              background: 'rgba(200,16,46,.06)',
              border: '1px solid rgba(200,16,46,.2)',
              borderRadius: 8, padding: '.625rem .875rem',
              fontFamily: "'Barlow', sans-serif",
              fontSize: '.82rem', color: '#8a1020', marginBottom: '.75rem',
            }}>
              ⚠️ {fel}
            </div>
          )}

          <form onSubmit={hanteraSpara}>
            <select
              value={valtVal}
              onChange={e => setValtVal(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px',
                fontFamily: "'Barlow', sans-serif", fontSize: '.9rem',
                border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 8,
                background: '#fff', color: valtVal ? '#0a1628' : '#aaa',
                outline: 'none', marginBottom: '.75rem',
                boxSizing: 'border-box', cursor: 'pointer',
                appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}
            >
              <option value="">— Välj rekryterare —</option>
              {valbara.map(d => (
                <option key={d.user_id} value={d.user_id}>{d.namn}</option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!valtVal || sparar}
              style={{
                width: '100%', padding: '11px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '.9rem', fontWeight: 700,
                letterSpacing: '.08em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg,#C5A028,#F0D060)',
                color: '#0a1628', border: 'none', borderRadius: 8,
                cursor: valtVal && !sparar ? 'pointer' : 'not-allowed',
                opacity: valtVal && !sparar ? 1 : 0.5,
                transition: 'opacity .15s',
              }}
            >
              {sparar ? 'Sparar...' : 'Spara val 🍷'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}