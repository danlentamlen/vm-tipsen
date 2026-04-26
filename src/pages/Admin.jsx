import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function VinBetalningar({ adminSecret }) {
  const [viner, setViner] = useState([])
  const [uppdaterar, setUppdaterar] = useState(null)

  useEffect(() => {
    fetch('/.netlify/functions/viner-hamta')
      .then((r) => r.json())
      .then(setViner)
      .catch(() => {})
  }, [])

  async function växlaBetalning(user_id, erBetalt) {
    setUppdaterar(user_id)
    try {
      const res = await fetch('/.netlify/functions/admin-betalning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ user_id, betalt: !erBetalt }),
      })
      if (res.ok) {
        setViner((prev) =>
          prev.map((v) =>
            v.user_id === user_id
              ? { ...v, betalt: !erBetalt ? 'betalt' : 'ej_betalt' }
              : v
          )
        )
      }
    } catch {}
    setUppdaterar(null)
  }

  if (viner.length === 0) {
    return <p className="text-gray-400 text-sm">Inga viner registrerade ännu.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500 border-b">
        <tr>
          <th className="pb-2 font-medium">Deltagare</th>
          <th className="pb-2 font-medium">Vin</th>
          <th className="pb-2 font-medium">Pris</th>
          <th className="pb-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {viner.map((v) => {
          const erBetalt = v.betalt === 'betalt'
          return (
            <tr key={v.user_id} className="border-t border-gray-50">
              <td className="py-2 font-medium text-gray-800">{v.namn}</td>
              <td className="py-2">
                {v.vin_namn ? (
                  <a
                    href={v.vin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 hover:underline"
                  >
                    {v.vin_namn}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Inget vin angivet</span>
                )}
              </td>
              <td className="py-2 text-gray-500">
                {v.vin_pris ? `${v.vin_pris} kr` : '—'}
              </td>
              <td className="py-2">
                {v.vin_namn ? (
                  <button
                    onClick={() => växlaBetalning(v.user_id, erBetalt)}
                    disabled={uppdaterar === v.user_id}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      erBetalt
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    } disabled:opacity-50`}
                  >
                    {uppdaterar === v.user_id
                      ? '...'
                      : erBetalt
                      ? '✅ Betalt'
                      : '⏳ Ej betalt'}
                  </button>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function Admin() {
  const [lösenord, setLösenord] = useState('')
  const [inloggad, setInloggad] = useState(false)
  const [fel, setFel] = useState(null)
  const [settings, setSettings] = useState(null)
  const [resultat, setResultat] = useState({ match_id: '', hemma: '', borta: '' })
  const [meddelande, setMeddelande] = useState(null)
  const [matcher, setMatcher] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (inloggad) {
      hämtaSettings()
      hämtaMatcher()
    }
  }, [inloggad])

  async function logga_in(e) {
    e.preventDefault()
    const res = await fetch('/.netlify/functions/admin', {
      headers: { Authorization: `Bearer ${lösenord}` },
    })
    if (res.ok) {
      setInloggad(true)
      setFel(null)
      localStorage.setItem('admin_secret', lösenord)
    } else {
      setFel('Fel lösenord')
    }
  }

  async function hämtaSettings() {
    const res = await fetch('/.netlify/functions/admin', {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_secret')}` },
    })
    const data = await res.json()
    setSettings(data)
  }

  async function hämtaMatcher() {
    const res = await fetch('/.netlify/functions/matches')
    const data = await res.json()
    setMatcher(data.filter((m) => !m.match_id.includes('match_0')))
    setMatcher(data)
  }

  async function toggleLås() {
    const nyttVärde = settings.tips_låst === 'true' ? 'false' : 'true'
    await fetch('/.netlify/functions/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_secret')}`,
      },
      body: JSON.stringify({ nyckel: 'tips_låst', värde: nyttVärde }),
    })
    visaMeddelande(nyttVärde === 'true' ? '🔒 Tips låsta!' : '🔓 Tips upplåsta!')
    hämtaSettings()
  }

  async function sparaResultat(e) {
    e.preventDefault()
    if (!resultat.match_id || resultat.hemma === '' || resultat.borta === '') return

    const sheets_res = await fetch('/.netlify/functions/admin-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_secret')}`,
      },
      body: JSON.stringify(resultat),
    })

    if (sheets_res.ok) {
      visaMeddelande('✅ Resultat sparat!')
      setResultat({ match_id: '', hemma: '', borta: '' })
    }
  }

  function visaMeddelande(text) {
    setMeddelande(text)
    setTimeout(() => setMeddelande(null), 3000)
  }

  if (!inloggad) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">
          Admin
        </h2>
        <form onSubmit={logga_in} className="bg-white rounded-xl shadow p-8 flex flex-col gap-4">
          {fel && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded">{fel}</div>
          )}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Lösenord</label>
            <input
              type="password"
              value={lösenord}
              onChange={(e) => setLösenord(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
          >
            Logga in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-green-700 mb-8">Adminpanel</h2>

      {meddelande && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-center font-medium">
          {meddelande}
        </div>
      )}

      {/* Lås-sektion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Tips & frågor</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">
              Status:{' '}
              <span className={settings?.tips_låst === 'true' ? 'text-red-600' : 'text-green-600'}>
                {settings?.tips_låst === 'true' ? '🔒 Låst' : '🔓 Öppet'}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {settings?.tips_låst === 'true'
                ? 'Deltagare kan inte längre ändra tips eller svar'
                : 'Deltagare kan fortfarande lämna och ändra tips'}
            </p>
          </div>
          <button
            onClick={toggleLås}
            className={`px-6 py-3 rounded-lg font-semibold ${
              settings?.tips_låst === 'true'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {settings?.tips_låst === 'true' ? 'Lås upp' : 'Lås tips'}
          </button>
        </div>
      </div>

      {/* Mata in resultat */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Mata in matchresultat</h3>
        <form onSubmit={sparaResultat} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Match</label>
            <select
              value={resultat.match_id}
              onChange={(e) => setResultat({ ...resultat, match_id: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Välj match...</option>
              {matcher.map((m) => (
                <option key={m.match_id} value={m.match_id}>
                  {m.datum} – {m.hemmalag} vs {m.bortalag}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1">Hemmamål</label>
              <input
                type="number"
                min="0"
                value={resultat.hemma}
                onChange={(e) => setResultat({ ...resultat, hemma: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="text-2xl font-bold text-gray-400 mt-6">–</div>
            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1">Bortamål</label>
              <input
                type="number"
                min="0"
                value={resultat.borta}
                onChange={(e) => setResultat({ ...resultat, borta: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
          >
            Spara resultat
          </button>
        </form>
      </div>

      {/* Vinbetalningar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">🍷 Vinbetalningar</h3>
        <VinBetalningar adminSecret={localStorage.getItem('admin_secret')} />
      </div>
    </div>
  )
}