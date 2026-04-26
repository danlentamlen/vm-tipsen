import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SWISH_NUMMER = '123 456 78 90' // Byt till riktigt nummer

export default function MinVin() {
  const { användare } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ vin_namn: '', vin_url: '', vin_pris: '' })
  const [befintlig, setBefintlig] = useState(null)
  const [betalt, setBetalt] = useState(false)
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(false)
  const [meddelande, setMeddelande] = useState(null)
  const [fel, setFel] = useState(null)

  useEffect(() => {
    if (!användare) {
      navigate('/login')
      return
    }
    hämtaVin()
  }, [användare])

  async function hämtaVin() {
    try {
      const res = await fetch('/.netlify/functions/viner-hamta')
      const viner = await res.json()
      const mitt = viner.find((v) => v.user_id === användare.user_id)
      if (mitt) {
        setBefintlig(mitt)
        setForm({ vin_namn: mitt.vin_namn, vin_url: mitt.vin_url, vin_pris: mitt.vin_pris })
        setBetalt(mitt.betalt === 'betalt')
      }
    } catch {
      // ignorera
    } finally {
      setLaddar(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)
    setMeddelande(null)
    setSparar(true)

    try {
      const res = await fetch('/.netlify/functions/viner-spara', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${användare.token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setFel(data.error)
      } else {
        setMeddelande('Vinet sparades! 🍷')
        setBefintlig({ ...form, betalt: betalt ? 'betalt' : 'ej_betalt' })
      }
    } catch {
      setFel('Något gick fel, försök igen')
    } finally {
      setSparar(false)
    }
  }

  if (laddar) {
    return (
      <div className="text-center py-16 text-gray-500">Laddar...</div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h2 className="text-3xl font-bold text-green-700 mb-2 text-center">🍷 Min vinflaska</h2>
      <p className="text-gray-500 text-center mb-8">
        Ange vilken vinflaska du bidrar med till prispotten
      </p>

      {/* Betalningsstatus */}
      <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${betalt ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <span className="text-2xl">{betalt ? '✅' : '⏳'}</span>
        <div>
          <p className={`font-semibold ${betalt ? 'text-green-700' : 'text-yellow-700'}`}>
            {betalt ? 'Betalning mottagen!' : 'Betalning ej registrerad'}
          </p>
          <p className="text-sm text-gray-500">
            {betalt
              ? 'Admin har bekräftat din betalning.'
              : 'Swisha kostnaden för flaskan till admin, så bekräftas betalningen.'}
          </p>
        </div>
      </div>

      {/* Swish-info */}
      {!betalt && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-blue-800 mb-2">💸 Swisha betalningen</h3>
          <p className="text-blue-700 text-sm mb-3">
            När du valt din flaska — swisha priset till:
          </p>
          <div className="bg-white rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Swish-nummer</p>
            <p className="text-2xl font-bold text-green-700 tracking-wider">{SWISH_NUMMER}</p>
          </div>
          <p className="text-blue-600 text-xs mt-2 text-center">
            Ange ditt namn i meddelandet
          </p>
        </div>
      )}

      {/* Formulär */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        {fel && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded">{fel}</div>
        )}
        {meddelande && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded">{meddelande}</div>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Vinets namn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="vin_namn"
            value={form.vin_namn}
            onChange={handleChange}
            required
            placeholder="t.ex. Barolo Chinato Cocchi"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Länk hos Systembolaget <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            name="vin_url"
            value={form.vin_url}
            onChange={handleChange}
            required
            placeholder="https://www.systembolaget.se/produkt/..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Kopiera länken från systembolaget.se
          </p>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Pris (kr)
          </label>
          <input
            type="number"
            name="vin_pris"
            value={form.vin_pris}
            onChange={handleChange}
            placeholder="t.ex. 249"
            min="0"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={sparar}
          className="bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
        >
          {sparar ? 'Sparar...' : befintlig ? '💾 Uppdatera' : '🍷 Spara mitt vin'}
        </button>
      </form>

      {/* Visa aktuell info om sparat */}
      {befintlig && befintlig.vin_url && (
        <div className="mt-4 text-center">
          <a
            href={befintlig.vin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 underline text-sm hover:text-green-600"
          >
            🔗 Visa ditt vin hos Systembolaget
          </a>
        </div>
      )}
    </div>
  )
}