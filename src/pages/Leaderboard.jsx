import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Leaderboard() {
  const [topplista, setTopplista] = useState([])
  const [laddar, setLaddar] = useState(true)
  const { användare } = useAuth()

  useEffect(() => {
    hämtaTopplista()
  }, [])

  async function hämtaTopplista() {
    const res = await fetch('/.netlify/functions/scores')
    const data = await res.json()
    setTopplista(data)
    setLaddar(false)
  }

  if (laddar) {
    return <div className="text-center py-16 text-gray-500">Laddar topplista...</div>
  }

  if (topplista.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">⏳</p>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Inga resultat än</h2>
        <p className="text-gray-500">Topplistan uppdateras när matchresultat matas in.</p>
      </div>
    )
  }

  const medaljer = ['🥇', '🥈', '🥉']

  return (
    <div>
      <h2 className="text-3xl font-bold text-green-700 mb-8">Topplista</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 bg-green-700 text-white text-sm font-medium px-6 py-3">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Namn</div>
          <div className="col-span-2 text-center">Poäng</div>
          <div className="col-span-2 text-center">Exakta</div>
          <div className="col-span-2 text-center">Rätta</div>
        </div>

        {/* Rader */}
        {topplista.map((rad) => {
          const ärJag = användare?.user_id === rad.user_id
          return (
            <div
              key={rad.user_id}
              className={`grid grid-cols-12 px-6 py-4 border-b border-gray-100 items-center
                ${ärJag ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}
              `}
            >
              <div className="col-span-1 text-lg">
                {rad.plats <= 3 ? medaljer[rad.plats - 1] : rad.plats}
              </div>
              <div className="col-span-5 flex items-center gap-2">
                {rad.namn}
                {ärJag && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Du
                  </span>
                )}
              </div>
              <div className="col-span-2 text-center font-bold text-green-700 text-lg">
                {rad.poäng}
              </div>
              <div className="col-span-2 text-center text-gray-600">
                {rad.exakta}
              </div>
              <div className="col-span-2 text-center text-gray-600">
                {rad.rätta}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex gap-6 text-sm text-gray-500 justify-center">
        <span>🎯 Exakt rätt resultat = <strong>5p</strong></span>
        <span>✅ Rätt utgång = <strong>2p</strong></span>
      </div>
    </div>
  )
}