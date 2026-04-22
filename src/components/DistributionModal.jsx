import { useState, useEffect } from 'react'

export default function DistributionModal({ typ, id, titel, onStäng }) {
  const [data, setData] = useState(null)
  const [laddar, setLaddar] = useState(true)
  const [fel, setFel] = useState(null)

  useEffect(() => {
    const param = typ === 'match' ? `match_id=${id}` : `fråga_id=${id}`
    fetch(`/.netlify/functions/distribution?${param}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setFel(data.error)
        } else {
          setData(data)
        }
        setLaddar(false)
      })
  }, [id, typ])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onStäng}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="font-bold text-gray-800 text-lg">{titel}</h3>
          <button
            onClick={onStäng}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Innehåll */}
        <div className="p-6">
          {laddar && (
            <p className="text-center text-gray-500">Laddar...</p>
          )}

          {fel && (
            <p className="text-center text-gray-500">{fel === 'Tips är inte låsta än' ? 'Fördelningen visas när tipsen är låsta.' : fel}</p>
          )}

          {data && (
            <>
              <p className="text-sm text-gray-500 mb-4 text-center">
                {data.totalt} {data.totalt === 1 ? 'tips' : 'tips'} lämnade
              </p>

              {data.fördelning.length === 0 ? (
                <p className="text-center text-gray-400">Inga tips lämnade</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.fördelning.map((rad, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{rad.resultat}</span>
                        <span className="text-gray-500">{rad.antal} st ({rad.procent}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${rad.procent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}