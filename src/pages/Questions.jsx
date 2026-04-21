import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Questions() {
  const [frågor, setFrågor] = useState([])
  const [lag, setLag] = useState([])
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [sparat, setSparat] = useState({})
  const { användare } = useAuth()

  useEffect(() => {
    hämtaAllt()
  }, [användare])

  async function hämtaAllt() {
    const headers = {}
    if (användare) headers.Authorization = `Bearer ${användare.token}`

    const [frågorRes, matcherRes] = await Promise.all([
      fetch('/.netlify/functions/questions', { headers }),
      fetch('/.netlify/functions/matches'),
    ])

    const frågorData = await frågorRes.json()
    const matcherData = await matcherRes.json()

    const lagSet = new Set()
    matcherData.forEach((match) => {
      const ärRiktigt = (namn) => namn && !/^[0-9WL]/.test(namn)
      if (ärRiktigt(match.hemmalag)) lagSet.add(match.hemmalag)
      if (ärRiktigt(match.bortalag)) lagSet.add(match.bortalag)
    })
    const sorterade = [...lagSet].sort()

    setFrågor(frågorData)
    setLag(sorterade)
    setLaddar(false)
  }

  async function sparaSvar(fråga_id, svar) {
    if (!användare || !svar.toString().trim()) return
    setSparar(fråga_id)

    await fetch('/.netlify/functions/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${användare.token}`,
      },
      body: JSON.stringify({ fråga_id, svar }),
    })

    setSparat((prev) => ({ ...prev, [fråga_id]: true }))
    setSparar(null)
    setTimeout(() => {
      setSparat((prev) => ({ ...prev, [fråga_id]: false }))
    }, 2000)
    hämtaAllt()
  }

  if (laddar) {
    return <div className="text-center py-16 text-gray-500">Laddar frågor...</div>
  }

  if (frågor.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">❓</p>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Inga frågor än</h2>
        <p className="text-gray-500">Frågorna publiceras innan VM startar.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-green-700 mb-2">Bonusfrågor</h2>
      <p className="text-gray-500 mb-8">
        Svara på frågorna innan VM startar. Rätt svar ger bonuspoäng!
      </p>

      {!användare && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <Link to="/login" className="font-medium hover:underline">Logga in</Link>{' '}
          för att svara på frågorna!
        </div>
      )}

      <div className="flex flex-col gap-4">
        {frågor.map((f) => (
          <FrågeKort
            key={f.fråga_id}
            fråga={f}
            lag={lag}
            inloggad={!!användare}
            sparar={sparar === f.fråga_id}
            nySparad={sparat[f.fråga_id]}
            onSpara={sparaSvar}
          />
        ))}
      </div>
    </div>
  )
}

function FrågeKort({ fråga, lag, inloggad, sparar, nySparad, onSpara }) {
  const [svar, setSvar] = useState(fråga.mitt_svar || '')

  useEffect(() => {
    setSvar(fråga.mitt_svar || '')
  }, [fråga.mitt_svar])

  const harSvarat = !!fråga.mitt_svar
  const rättSvarVisat = fråga.har_rätt_svar
  const ärChoice = fråga.typ?.startsWith('choice')
  const ärNumber = fråga.typ === 'number'
  const ärTeam = fråga.typ === 'team'
  const alternativ = ärChoice ? fråga.typ.split(':')[1]?.split('/') || [] : []

  function renderInput() {
    if (rättSvarVisat) {
      return (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500 mb-1">Ditt svar:</p>
          <p className="font-medium text-gray-700">{fråga.mitt_svar || '–'}</p>
        </div>
      )
    }

    if (!inloggad) return null

    if (ärTeam) {
      return (
        <TeamVäljare
          lag={lag}
          värde={svar}
          onChange={setSvar}
          onSpara={() => onSpara(fråga.fråga_id, svar)}
          sparar={sparar}
          nySparad={nySparad}
          harSvarat={harSvarat}
        />
      )
    }

    if (ärChoice) {
      return (
        <div className="flex flex-wrap gap-2">
          {alternativ.map((alt) => (
            <button
              key={alt}
              onClick={() => {
                setSvar(alt)
                onSpara(fråga.fråga_id, alt)
              }}
              disabled={sparar}
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-colors ${
                svar === alt
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
              }`}
            >
              {alt}
            </button>
          ))}
          {nySparad && (
            <span className="text-green-600 text-sm self-center">✓ Sparat!</span>
          )}
        </div>
      )
    }

    return (
      <div className="flex gap-2">
        <input
          type={ärNumber ? 'number' : 'text'}
          min={ärNumber ? 0 : undefined}
          value={svar}
          onChange={(e) => setSvar(e.target.value)}
          placeholder={ärNumber ? 'Ange ett tal...' : 'Ditt svar...'}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => onSpara(fråga.fråga_id, svar)}
          disabled={sparar || !svar.toString().trim()}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            nySparad
              ? 'bg-green-100 text-green-700'
              : harSvarat
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-green-700 text-white hover:bg-green-600'
          } disabled:opacity-40`}
        >
          {sparar ? '...' : nySparad ? '✓ Sparat!' : harSvarat ? 'Uppdatera' : 'Spara'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <p className="font-semibold text-gray-800 text-lg flex-1 pr-4">
          {fråga.fråga}
        </p>
        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm whitespace-nowrap">
          {fråga.poäng}p
        </span>
      </div>
      {renderInput()}
    </div>
  )
}

function TeamVäljare({ lag, värde, onChange, onSpara, sparar, nySparad, harSvarat }) {
  const [sök, setSök] = useState('')
  const [öppen, setÖppen] = useState(false)

  const filtrerade = lag.filter((l) =>
    l.toLowerCase().includes(sök.toLowerCase())
  )

  function välj(valtLag) {
    onChange(valtLag)
    setSök('')
    setÖppen(false)
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 relative">
        <div
          className="w-full border border-gray-300 rounded-lg px-4 py-2 cursor-pointer flex justify-between items-center bg-white"
          onClick={() => setÖppen(!öppen)}
        >
          <span className={värde ? 'text-gray-800' : 'text-gray-400'}>
            {värde || 'Välj ett lag...'}
          </span>
          <span className="text-gray-400 text-xs">{öppen ? '▲' : '▼'}</span>
        </div>

        {öppen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={sök}
                onChange={(e) => setSök(e.target.value)}
                placeholder="Sök lag..."
                autoFocus
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {filtrerade.length === 0 ? (
                <li className="px-4 py-2 text-sm text-gray-400">Inga lag hittades</li>
              ) : (
                filtrerade.map((l) => (
                  <li
                    key={l}
                    onClick={() => välj(l)}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-green-50 ${
                      l === värde ? 'bg-green-50 font-medium text-green-700' : 'text-gray-700'
                    }`}
                  >
                    {l}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={onSpara}
        disabled={sparar || !värde}
        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
          nySparad
            ? 'bg-green-100 text-green-700'
            : harSvarat
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-green-700 text-white hover:bg-green-600'
        } disabled:opacity-40`}
      >
        {sparar ? '...' : nySparad ? '✓ Sparat!' : harSvarat ? 'Uppdatera' : 'Spara'}
      </button>
    </div>
  )
}