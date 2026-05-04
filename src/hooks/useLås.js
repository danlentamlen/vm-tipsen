import { useState, useEffect } from 'react'

/**
 * useLås — hämtar låsstatus per match från settings-endpointen.
 *
 * Backend beräknar automatiskt om varje match är låst baserat på:
 * - Gruppspel: låst om nu >= 2026-06-11 00:00 CEST, eller om admin satt tips_låst=true
 * - Slutspel:  låst om nu >= (första matchens starttid i omgången) - 4 timmar
 *
 * Returnerar:
 *   ärLåst(match)     — true om matchen är låst
 *   adminOverride     — true om admin tvångslåst allt via tips_låst-flaggan
 *   frågorLåsta       — true om tilläggsfrågor är låsta
 *   laddar            — true medan data hämtas
 */
export function useLås() {
  const [matchLås, setMatchLås]           = useState({})
  const [adminOverride, setAdminOverride] = useState(false)
  const [frågorLåsta, setFrågorLåsta]     = useState(false)
  const [laddar, setLaddar]               = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/settings')
      .then((res) => res.json())
      .then((data) => {
        setMatchLås(data.match_lås || {})
        setFrågorLåsta(data.frågor_låsta === true || data.frågor_låsta === 'true')
        setAdminOverride(data.tips_låst === 'true' || data.tips_låst === true)
        setLaddar(false)
      })
      .catch(() => {
        setMatchLås({})
        setFrågorLåsta(false)
        setAdminOverride(false)
        setLaddar(false)
      })
  }, [])

  /**
   * Returnerar true om en specifik match är låst.
   * Accepterar antingen ett match-objekt { match_id } eller en sträng.
   */
  function ärLåst(matchEllerMatchId) {
    const id = typeof matchEllerMatchId === 'string'
      ? matchEllerMatchId
      : matchEllerMatchId?.match_id
    if (!id) return false
    return matchLås[id] === true
  }

  return {
    ärLåst,
    adminOverride,
    frågorLåsta,
    laddar,
    tipsLåst: adminOverride, // bakåtkompatibilitet
  }
}