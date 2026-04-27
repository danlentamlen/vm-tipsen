import { useState, useEffect } from 'react'

export function useSettings() {
  const [tipsLåst, setTipsLåst] = useState(false)
  const [laddar, setLaddar] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/settings')
      .then((res) => res.json())
      .then((data) => {
        // Sheets returnerar strängen "true"/"false" — konvertera till boolean
        setTipsLåst(data.tips_låst === 'true' || data.tips_låst === true)
        setLaddar(false)
      })
      .catch(() => {
        // Vid fel — anta att tips är öppna
        setTipsLåst(false)
        setLaddar(false)
      })
  }, [])

  return { tipsLåst, laddar }
}