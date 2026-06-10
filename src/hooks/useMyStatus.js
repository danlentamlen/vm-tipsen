import { useState, useEffect } from 'react'

/**
 * useMyStatus — hämtar inloggad användares tips-status.
 *
 * Returnerar:
 *   matchDone    — antal tipsade gruppspelsmatcher
 *   matchTotal   — totalt antal gruppspelsmatcher
 *   frågaDone    — antal besvarade tilläggsfrågor
 *   frågaTotal   — totalt antal tilläggsfrågor
 *   allaKlara    — true om matcher och frågor är 100% klara
 *   saknasCount  — totalt antal saknade (matcher + frågor)
 *   laddar       — true medan data hämtas
 */
export function useMyStatus(användare) {
  const [status, setStatus] = useState(null)
  const [laddar, setLaddar] = useState(false)

  useEffect(() => {
    if (!användare?.token) {
      setStatus(null)
      return
    }

    setLaddar(true)
    fetch('/.netlify/functions/my-status', {
      headers: { Authorization: `Bearer ${användare.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStatus(data)
      })
      .catch(() => {})
      .finally(() => setLaddar(false))
  }, [användare?.token])

  if (!status) return { matchDone: 0, matchTotal: 0, frågaDone: 0, frågaTotal: 0, allaKlara: false, saknasCount: 0, laddar }

  const { matcher, frågor } = status
  const saknasCount = (matcher.total - matcher.done) + (frågor.total - frågor.done)
  const allaKlara   = saknasCount === 0 && matcher.total > 0

  return {
    matchDone:   matcher.done,
    matchTotal:  matcher.total,
    frågaDone:   frågor.done,
    frågaTotal:  frågor.total,
    allaKlara,
    saknasCount,
    laddar,
  }
}
