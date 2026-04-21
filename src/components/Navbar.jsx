import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { användare, logga_ut } = useAuth()

  return (
    <nav className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">
        ⚽ VM-tipsen 2026
      </Link>
      <Link to="/matches" className="hover:text-green-200">
        Matcher
      </Link>
      <div className="flex gap-4 items-center">
        {användare ? (
          <>
            <span className="text-green-200">Hej, {användare.namn}!</span>
            <button
              onClick={logga_ut}
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
            >
              Logga ut
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-green-200">
              Logga in
            </Link>
            <Link
              to="/register"
              className="bg-white text-green-700 font-semibold px-4 py-2 rounded hover:bg-green-100"
            >
              Registrera
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}