import { useState, useEffect } from 'react'

// Visa sökruta inuti en utfälld rad först när listan blir lång nog att det behövs.
const SÖK_TRÖSKEL = 12

export default function DistributionModal({ typ, id, titel, markeraResultat, onStäng }) {
  const [data, setData] = useState(null)
  const [laddar, setLaddar] = useState(true)
  const [fel, setFel] = useState(null)
  const [öppna, setÖppna] = useState(() => new Set())
  const [sök, setSök] = useState('')

  useEffect(() => {
    const param = typ === 'match' ? `match_id=${id}` : `fråga_id=${id}`
    fetch(`/.netlify/functions/distribution?${param}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setFel(data.error)
        } else {
          setData(data)
          // Fäll automatiskt ut raden som matchar det faktiska resultatet.
          if (markeraResultat) setÖppna(new Set([markeraResultat]))
        }
        setLaddar(false)
      })
      .catch(() => {
        setFel('Något gick fel')
        setLaddar(false)
      })
  }, [id, typ, markeraResultat])

  function toggla(resultat) {
    setSök('')
    setÖppna((föregående) => {
      const ny = new Set(föregående)
      if (ny.has(resultat)) ny.delete(resultat)
      else ny.add(resultat)
      return ny
    })
  }

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
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
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
          {laddar && <p className="text-center text-gray-500">Laddar...</p>}

          {fel && (
            <p className="text-center text-gray-500">
              {fel === 'Tips är inte låsta än'
                ? 'Fördelningen visas när tipsen är låsta.'
                : fel}
            </p>
          )}

          {data && (
            <>
              <p className="text-sm text-gray-500 mb-4 text-center">
                {data.totalt} tips lämnade
                <span className="block text-xs text-gray-400 mt-0.5">
                  Tryck på ett resultat för att se vilka som tippat det
                </span>
              </p>

              {data.fördelning.length === 0 ? (
                <p className="text-center text-gray-400">Inga tips lämnade</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.fördelning.map((rad, i) => {
                    const ärRätt = markeraResultat && rad.resultat === markeraResultat
                    const ärÖppen = öppna.has(rad.resultat)
                    const namn = rad.namn || []
                    const visaSök = ärÖppen && namn.length > SÖK_TRÖSKEL
                    const filtrerade =
                      visaSök && sök.trim()
                        ? namn.filter((n) =>
                            n.toLowerCase().includes(sök.trim().toLowerCase())
                          )
                        : namn

                    return (
                      <div
                        key={i}
                        className={`rounded-xl border transition-colors ${
                          ärRätt ? 'border-green-300 bg-green-50' : 'border-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => toggla(rad.resultat)}
                          className="w-full text-left px-3 py-2"
                        >
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium text-gray-700 flex items-center gap-2">
                              <span
                                className={`transition-transform text-gray-400 text-xs ${
                                  ärÖppen ? 'rotate-90' : ''
                                }`}
                              >
                                ▶
                              </span>
                              {rad.resultat}
                              {ärRätt && (
                                <span className="text-[0.65rem] font-bold uppercase tracking-wide bg-green-500 text-white px-2 py-0.5 rounded-full">
                                  ✓ Rätt nu
                                </span>
                              )}
                            </span>
                            <span className="text-gray-500">
                              {rad.antal} st ({rad.procent}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                ärRätt ? 'bg-green-500' : 'bg-green-400'
                              }`}
                              style={{ width: `${rad.procent}%` }}
                            />
                          </div>
                        </button>

                        {ärÖppen && (
                          <div className="px-3 pb-3 pt-1">
                            {visaSök && (
                              <input
                                type="text"
                                value={sök}
                                onChange={(e) => setSök(e.target.value)}
                                placeholder="Sök namn…"
                                className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-400"
                              />
                            )}
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                              {filtrerade.length === 0 ? (
                                <span className="text-xs text-gray-400">Ingen träff</span>
                              ) : (
                                filtrerade.map((n, j) => (
                                  <span
                                    key={j}
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      ärRätt
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {n}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
