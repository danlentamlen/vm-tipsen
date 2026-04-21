import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Matches() {
  const [matcher, setMatcher] = useState([])
  const [minaTips, setMinaTips] = useState({})
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const { användare } = useAuth()

  useEffect(() => {
    hämtaMatcher()
    if (användare) hämtaMinaTips()
  }, [användare])

  async function hämtaMatcher() {
    const res = await fetch('/.netlify/functions/matches')
    const data = await res.json()
    setMatcher(data)
    setLaddar(false)
  }

  async function hämtaMinaTips() {
    const res = await fetch('/.netlify/functions/tips', {
      headers: { Authorization: `Bearer ${användare.token}` },
    })
    const data = await res.json()
    const tipsMap = {}
    data.forEach((tip) => {
      tipsMap[tip.match_id] = tip
    })
    setMinaTips(tipsMap)
  }

  async function sparaTips(match_id, hemma, borta) {
    if (!användare) return
    setSparar(match_id)
    await fetch('/.netlify/functions/tips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${användare.token}`,
      },
      body: JSON.stringify({
        match_id,
        hemma_mål: hemma,
        borta_mål: borta,
      }),
    })
    setSparar(null)
    hämtaMinaTips()
  }

  // Gruppera matcher per grupp/omgång
  const grupperadematcher = matcher.reduce((acc, match) => {
    const nyckel = match.grupp
    if (!acc[nyckel]) acc[nyckel] = []
    acc[nyckel].push(match)
    return acc
  }, {})

  if (laddar) {
    return (
      <div className="text-center py-16 text-gray-500">
        Laddar matcher...
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-green-700 mb-8">Matchschema</h2>
      {!användare && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          Logga in för att lämna dina tips!
        </div>
      )}
      {Object.entries(grupperadematcher).map(([grupp, gruppsMatcherna]) => (
        <div key={grupp} className="mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
            {grupp}
          </h3>
          <div className="flex flex-col gap-3">
            {gruppsMatcherna.map((match) => (
              <MatchKort
                key={match.match_id}
                match={match}
                tip={minaTips[match.match_id]}
                inloggad={!!användare}
                sparar={sparar === match.match_id}
                onSpara={sparaTips}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchKort({ match, tip, inloggad, sparar, onSpara }) {
  const [hemma, setHemma] = useState(tip?.hemma_mål ?? '')
  const [borta, setBorta] = useState(tip?.borta_mål ?? '')

  useEffect(() => {
    setHemma(tip?.hemma_mål ?? '')
    setBorta(tip?.borta_mål ?? '')
  }, [tip])

  const harTips = tip !== undefined

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right font-semibold text-gray-800">
          {match.hemmalag}
        </div>
        {inloggad ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="99"
              value={hemma}
              onChange={(e) => setHemma(e.target.value)}
              className="w-12 text-center border border-gray-300 rounded-lg py-1 text-lg font-bold"
            />
            <span className="text-gray-400 font-bold">–</span>
            <input
              type="number"
              min="0"
              max="99"
              value={borta}
              onChange={(e) => setBorta(e.target.value)}
              className="w-12 text-center border border-gray-300 rounded-lg py-1 text-lg font-bold"
            />
            <button
              onClick={() => onSpara(match.match_id, hemma, borta)}
              disabled={sparar || hemma === '' || borta === ''}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                harTips
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-green-700 text-white hover:bg-green-600'
              } disabled:opacity-40`}
            >
              {sparar ? '...' : harTips ? 'Uppdatera' : 'Spara'}
            </button>
          </div>
        ) : (
          <span className="text-gray-300 font-bold px-4">vs</span>
        )}
        <div className="flex-1 font-semibold text-gray-800">
          {match.bortalag}
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 mt-2">
        {match.datum} {match.tid} · {match.arena}
      </div>
    </div>
  )
}