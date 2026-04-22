import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Participants() {
  const [deltagare, setDeltagare] = useState([])
  const [laddar, setLaddar] = useState(true)
  const { användare } = useAuth()

  useEffect(() => {
    fetch('/.netlify/functions/participants')
      .then((res) => res.json())
      .then((data) => {
        setDeltagare(data)
        setLaddar(false)
      })
  }, [])

  if (laddar) {
    return <div className="text-center py-16 text-gray-500">Laddar deltagare...</div>
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-green-700 mb-8">Deltagare</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {deltagare.map((d) => (
          <Link
            key={d.user_id}
            to={`/participant/${d.user_id}`}
            className={`bg-white rounded-xl shadow-sm border p-4 text-center hover:border-green-400 hover:shadow-md transition-all ${
              användare?.user_id === d.user_id
                ? 'border-green-400 bg-green-50'
                : 'border-gray-100'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center mx-auto mb-3">
              {d.namn.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-gray-800 truncate">{d.namn}</p>
            {användare?.user_id === d.user_id && (
              <span className="text-xs text-green-600 font-medium">Du</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}