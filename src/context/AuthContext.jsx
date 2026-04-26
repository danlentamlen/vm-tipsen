import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function isExpired(token) {
  const payload = parseToken(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 < Date.now()
}

function läsAnvändare() {
  try {
    const sparad = localStorage.getItem('vm_användare')
    if (!sparad) return null
    const data = JSON.parse(sparad)
    if (!data?.token || isExpired(data.token)) {
      localStorage.removeItem('vm_användare')
      return null
    }
    return data
  } catch {
    localStorage.removeItem('vm_användare')
    return null
  }
}

export function AuthProvider({ children }) {
  const [användare, setAnvändare] = useState(läsAnvändare)

  // Kolla utgångsdatum en gång per minut medan appen är öppen
  useEffect(() => {
    const interval = setInterval(() => {
      if (användare && isExpired(användare.token)) {
        localStorage.removeItem('vm_användare')
        setAnvändare(null)
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [användare])

  function logga_in(data) {
    localStorage.setItem('vm_användare', JSON.stringify(data))
    setAnvändare(data)
  }

  function logga_ut() {
    localStorage.removeItem('vm_användare')
    setAnvändare(null)
  }

  return (
    <AuthContext.Provider value={{ användare, logga_in, logga_ut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}