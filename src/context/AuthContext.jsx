import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [användare, setAnvändare] = useState(() => {
    const sparad = localStorage.getItem('vm_användare')
    return sparad ? JSON.parse(sparad) : null
  })

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