import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { användare } = useAuth()

  return (
    <div className="text-center py-16">
      <h1 className="text-5xl font-bold text-green-700 mb-4">
        ⚽ VM-tipsen 2026
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Tippa matcherna, samla poäng och vinn vinet!
      </p>
      {användare ? (
        <p className="text-green-700 font-semibold text-lg">
          Välkommen tillbaka, {användare.namn}! 🎉
        </p>
      ) : (
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-600"
          >
            Anmäl dig
          </Link>
          <Link
            to="/login"
            className="border-2 border-green-700 text-green-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-50"
          >
            Logga in
          </Link>
        </div>
      )}
    </div>
  )
}