import { useState, useEffect } from 'react'

export default function Vinpotten() {
  const [viner, setViner] = useState([])
  const [laddar, setLaddar] = useState(true)

  useEffect(() => {
    hämtaViner()
  }, [])

  async function hämtaViner() {
    try {
      const res = await fetch('/.netlify/functions/viner-hamta')
      const data = await res.json()
      setViner(data.filter((v) => v.vin_namn))
    } catch {
      // ignorera
    } finally {
      setLaddar(false)
    }
  }

  // Gruppera på vin_namn
  const grupperade = Object.values(
    viner.reduce((acc, v) => {
      if (!acc[v.vin_namn]) {
        acc[v.vin_namn] = { ...v, antal: 1 }
      } else {
        acc[v.vin_namn].antal += 1
      }
      return acc
    }, {})
  )

  const totalPris = viner.reduce((sum, v) => sum + (Number(v.vin_pris) || 0), 0)

  if (laddar) {
    return <div className="text-center py-16 text-gray-500">Laddar...</div>
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-green-700 mb-2">🏆 Vinpotten</h2>
        <p className="text-gray-500">Alla viner som ingår i prispotten</p>
        {totalPris > 0 && (
          <p className="mt-2 text-lg font-semibold text-green-800">
            Totalt värde: {totalPris} kr
          </p>
        )}
      </div>

      {grupperade.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-4">🍾</p>
          <p>Inga viner har lagts till ännu</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {grupperade.map((v, i) => (
            <a
              key={v.vin_namn || i}
              href={v.vin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl shadow p-5 flex items-center gap-5 hover:shadow-md transition-shadow"
            >
              {/* Bild */}
              <div className="w-20 h-24 flex-shrink-0 flex items-center justify-center">
                {v.bild_url ? (
                  <img
                    src={v.bild_url}
                    alt={v.vin_namn}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-4xl">🍷</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-gray-800">{v.vin_namn}</p>
                  {v.antal > 1 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      ×{v.antal}
                    </span>
                  )}
                  {v.betalt === 'betalt' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      ✓ Betalt
                    </span>
                  )}
                </div>
                {v.vin_pris && (
                  <p className="text-sm text-gray-500">
                    {v.antal > 1 ? `${v.vin_pris} kr × ${v.antal} = ${v.antal * Number(v.vin_pris)} kr` : `${v.vin_pris} kr`}
                  </p>
                )}
              </div>

              <span className="text-green-700 text-sm font-medium whitespace-nowrap">
                Systembolaget →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}