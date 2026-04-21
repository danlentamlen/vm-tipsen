import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ email: '', lösenord: '' })
  const [fel, setFel] = useState(null)
  const [laddar, setLaddar] = useState(false)
  const { logga_in } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFel(null)
    setLaddar(true)

    try {
      const res = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setFel(data.error)
        return
      }

      logga_in(data)
      navigate('/')
    } catch (err) {
      setFel('Något gick fel, försök igen')
    } finally {
      setLaddar(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">
        Logga in
      </h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8 flex flex-col gap-4">
        {fel && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded">
            {fel}
          </div>
        )}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Lösenord</label>
          <input
            type="password"
            name="lösenord"
            value={form.lösenord}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="submit"
          disabled={laddar}
          className="bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
        >
          {laddar ? 'Loggar in...' : 'Logga in'}
        </button>
        <p className="text-center text-gray-500 text-sm">
          Inget konto?{' '}
          <Link to="/register" className="text-green-700 font-medium hover:underline">
            Registrera dig här
          </Link>
        </p>
      </form>
    </div>
  )
}