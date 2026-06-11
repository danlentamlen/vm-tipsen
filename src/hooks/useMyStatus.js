import { useState, useEffect } from 'react'

const GRUPPSPEL_DEADLINE = new Date('2026-06-11T19:00:00+02:00')
// Quiet period: after group stage deadline, show green dot until first knockout round opens.
// As soon as slutspel.öppen=true (≈1.5 days before first R32 game), real status kicks in.
const QUIET_UNTIL = new Date('2026-06-26T00:00:00+02:00')

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
  const nu            = new Date()
  const efterDeadline = nu >= GRUPPSPEL_DEADLINE
  // Quiet/rest period: after group stage but before June 26, AND no knockout round is open yet.
  // Once the admin adds R32 matches (≈1.5 days before first game), slutspel.öppen flips to true
  // and we exit quiet mode — showing the real green/red status again.
  const iVilaFas = efterDeadline && nu < QUIET_UNTIL

  // Vad som räknas som "saknas" beror på var i turneringen vi är
  let saknasCount = 0
  let allaKlara   = false

  if (iVilaFas) {
    // Rest period between rounds — nothing to do, always green
    allaKlara   = true
    saknasCount = 0
  } else if (!efterDeadline) {
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
