import { useState, useEffect } from 'react'

const GRUPPSPEL_DEADLINE = new Date('2026-06-11T19:00:00+02:00')

/**
 * useMyStatus — hämtar inloggad användares tips-status.
 *
 * Returnerar:
 *   matchDone / matchTotal   — gruppspelsmatcher
 *   frågaDone / frågaTotal   — tilläggsfrågor
 *   slutspel                 — { omgång, done, total, öppen } | null
 *   efterDeadline            — true om gruppspels-deadline passerats
 *   allaKlara                — true om allt relevant är klart
 *   saknasCount              — antal saknade (kontext-beroende)
 *   laddar
 */
export function useMyStatus(användare) {
  const [status, setStatus] = useState(null)
  const [laddar, setLaddar] = useState(false)

  useEffect(() => {
    if (!användare?.token) { setStatus(null); return }
    setLaddar(true)
    fetch('/.netlify/functions/my-status', {
      headers: { Authorization: `Bearer ${användare.token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStatus(data) })
      .catch(() => {})
      .finally(() => setLaddar(false))
  }, [användare?.token])

  if (!status) {
    return { matchDone: 0, matchTotal: 0, frågaDone: 0, frågaTotal: 0, slutspel: null, efterDeadline: false, allaKlara: false, saknasCount: 0, laddar }
  }

  const { matcher, frågor, slutspel } = status
  const efterDeadline = new Date() >= GRUPPSPEL_DEADLINE

  // Vad som räknas som "saknas" beror på var i turneringen vi är
  let saknasCount = 0
  let allaKlara   = false

  if (!efterDeadline) {
    // Före deadline: gruppspel + frågor
    saknasCount = (matcher.total - matcher.done) + (frågor.total - frågor.done)
    allaKlara   = saknasCount === 0 && matcher.total > 0
  } else if (slutspel) {
    // Efter deadline: aktiv slutspelsomgång + frågor
    saknasCount = (slutspel.total - slutspel.done) + (frågor.total - frågor.done)
    allaKlara   = saknasCount === 0 && slutspel.total > 0
  } else {
    // Ingen aktiv omgång — frågor kvar?
    saknasCount = frågor.total - frågor.done
    allaKlara   = saknasCount === 0 && frågor.total > 0
  }

  return {
    matchDone:    matcher.done,
    matchTotal:   matcher.total,
    frågaDone:    frågor.done,
    frågaTotal:   frågor.total,
    slutspel,
    efterDeadline,
    allaKlara,
    saknasCount,
    laddar,
  }
}
