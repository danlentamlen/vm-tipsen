import { useState, useEffect } from 'react'

export function useSettings() {
  const [matchLås, setMatchLås]       = useState({})  // { match_id: boolean }
  const [frågorLåsta, setFrågorLåsta] = useState(false)
  const [tipsLåst, setTipsLåst]       = useState(false) // bakåtkompatibilitet
  const [laddar, setLaddar]           = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/settings')
      .then((res) => res.json())
      .then((data) => {
        setMatchLås(data.match_lås || {})
        setFrågorLåsta(data.frågor_låsta === true || data.frågor_låsta === 'true')
        // Bakåtkompatibilitet — Admin.jsx använder tips_låst
        setTipsLåst(data.tips_låst === 'true' || data.tips_låst === true)
        setLaddar(false)
      })
      .catch(() => {
        setMatchLås({})
        setFrågorLåsta(false)
        setTipsLåst(false)
        setLaddar(false)
      })
  }, [])

  /**
   * Returnerar true om en specifik match är låst
   * @param {string} match_id
   */
  function ärMatchLåst(match_id) {
    return matchLås[match_id] === true
  }

  return {
    matchLås,
    frågorLåsta,
    tipsLåst,    // bakåtkompatibilitet
    ärMatchLåst,
    laddar,
  }
}