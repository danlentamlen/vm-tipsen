import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'

export default function ParticipantProfile() {
  const { user_id } = useParams()
  const [profil, setProfil] = useState(null)
  const [laddar, setLaddar] = useState(true)
  const [aktivFlik, setAktivFlik] = useState('tips')
  const { tipsLåst } = useSettings()

  useEffect(() => {
    fetch(`/.netlify/functions/participants?user_id=${user_id}`)
      .then((res) => res.json())
      .then((data) => {
        setProfil(data)
        setLaddar(false)
      })
  }, [user_id])

  if (laddar) {
    return <div className="text-center py-16 text-gray-500">Laddar profil...</div>
  }

  if (!profil || profil.error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Deltagaren hittades inte.</p>
        <Link to="/participants" className="text-green-700 hover:underline mt-2 block">
          Tillbaka till deltagare
        </Link>
      </div>
    )
  }

  const totalPoäng = profil.tips.reduce((sum, t) => sum + (t.poäng || 0), 0)
  const exakta = profil.tips.filter((t) => t.poäng === 5).length
  const rätta = profil.tips.filter((t) => t.poäng === 2).length

  // Gruppera tips per grupp
  const grupperande = profil.tips.reduce((acc, tip) => {
    const g = tip.grupp || 'Övrigt'
    if (!acc[g]) acc[g] = []
    acc[g].push(tip)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/participants" className="text-green-700 hover:underline text-sm">
          ← Alla deltagare
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 font-bold text-2xl flex items-center justify-center">
            {profil.namn.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{profil.namn}</h2>
            <p className="text-gray-500 text-sm">{profil.tips.length} tips lämnade</p>
          </div>
        </div>

        {tipsLåst && (
          <div className="grid grid-cols-3 gap-4 mt-6 border-t pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{totalPoäng}</p>
              <p className="text-xs text-gray-500">Poäng</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{exakta}</p>
              <p className="text-xs text-gray-500">Exakta</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{rätta}</p>
              <p className="text-xs text-gray-500">Rätta utgångar</p>
            </div>
          </div>
        )}
      </div>

      {/* Flikar */}
      {tipsLåst ? (
        <>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAktivFlik('tips')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                aktivFlik === 'tips'
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
              }`}
            >
              Tips ({profil.tips.length})
            </button>
            <button
              onClick={() => setAktivFlik('svar')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                aktivFlik === 'svar'
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
              }`}
            >
              Bonusfrågor ({profil.svar.length})
            </button>
          </div>

          {aktivFlik === 'tips' && (
            <div>
              {Object.entries(grupperande).map(([grupp, tips]) => (
                <div key={grupp} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">
                    {grupp}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {tips.map((tip) => (
                      <div
                        key={tip.match_id}
                        className={`bg-white rounded-xl border p-4 ${
                          tip.poäng === 5
                            ? 'border-green-300 bg-green-50'
                            : tip.poäng === 2
                            ? 'border-blue-200 bg-blue-50'
                            : tip.poäng === 0
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-right text-sm font-semibold text-gray-700">
                            {tip.hemmalag}
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg text-gray-800">
                              {tip.tip_hemma} – {tip.tip_borta}
                            </div>
                            {tip.resultat_hemma !== null && (
                              <div className="text-xs text-gray-500">
                                Facit: {tip.resultat_hemma}–{tip.resultat_borta}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-sm font-semibold text-gray-700">
                            {tip.bortalag}
                          </div>
                          {tip.poäng !== null && (
                            <div className={`font-bold text-sm min-w-8 text-right ${
                              tip.poäng === 5 ? 'text-green-600' :
                              tip.poäng === 2 ? 'text-blue-600' : 'text-red-500'
                            }`}>
                              +{tip.poäng}p
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {aktivFlik === 'svar' && (
            <div className="flex flex-col gap-3">
              {profil.svar.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Inga svar lämnade.</p>
              ) : (
                profil.svar.map((s) => (
                  <div
                    key={s.fråga_id}
                    className="bg-white rounded-xl border border-gray-100 p-4"
                  >
                    <p className="text-sm text-gray-500 mb-1">{s.fråga}</p>
                    <p className="font-semibold text-gray-800">{s.svar}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Tips och svar visas när tävlingen är låst.
        </div>
      )}
    </div>
  )
}