import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'
import DistributionModal from '../components/DistributionModal'

export default function Matches() {
  const [matcher, setMatcher] = useState([])
  const [minaTips, setMinaTips] = useState({})
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState(null)
  const [valdMatch, setValdMatch] = useState(null)
  const { användare } = useAuth()
  const { tipsLåst } = useSettings()

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

      {användare && tipsLåst && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          🔒 Tips är låsta – du kan inte längre ändra dina gissningar. Klicka på en match för att se tipsfördelningen!
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
                tipsLåst={tipsLåst}
                sparar={sparar === match.match_id}
                onSpara={sparaTips}
                onKlick={tipsLåst ? () => setValdMatch(match) : null}
              />
            ))}
          </div>
        </div>
      ))}

      {valdMatch && (
        <DistributionModal
          typ="match"
          id={valdMatch.match_id}
          titel={`${valdMatch.hemmalag} vs ${valdMatch.bortalag}`}
          onStäng={() => setValdMatch(null)}
        />
      )}
    </div>
  )
}

function MatchKort({ match, tip, inloggad, tipsLåst, sparar, onSpara, onKlick }) {
  const [hemma, setHemma] = useState(tip?.hemma_mål ?? '')
  const [borta, setBorta] = useState(tip?.borta_mål ?? '')

  useEffect(() => {
    setHemma(tip?.hemma_mål ?? '')
    setBorta(tip?.borta_mål ?? '')
  }, [tip])

  const harTips = tip !== undefined

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${
        onKlick ? 'cursor-pointer hover:border-green-400 hover:shadow-md transition-all' : ''
      }`}
      onClick={onKlick || undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right font-semibold text-gray-800">
          {match.hemmalag}
        </div>

        {inloggad && !tipsLåst ? (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
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
        ) : inloggad && tipsLåst && harTips ? (
          <div className="flex items-center gap-2">
            <span className="w-12 text-center text-lg font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg py-1">
              {hemma}
            </span>
            <span className="text-gray-400 font-bold">–</span>
            <span className="w-12 text-center text-lg font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg py-1">
              {borta}
            </span>
            <span className="text-gray-400 text-xs px-2">🔒</span>
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