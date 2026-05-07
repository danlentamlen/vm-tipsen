import { getSheets, getRows } from './_sheets.js'

export default async (req) => {
  try {
    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Användare!A2:F1000')

    // Bygg map: user_id -> namn
    const namnMap = {}
    rader.forEach(rad => {
      if (rad[0]) namnMap[rad[0]] = rad[1] || 'Okänd'
    })

    // Räkna rekryteringar per user_id (kolumn F = index 5)
    const räknare = {}
    rader.forEach(rad => {
      const rekryteradAv = rad[5]?.trim()
      if (rekryteradAv && namnMap[rekryteradAv]) {
        räknare[rekryteradAv] = (räknare[rekryteradAv] || 0) + 1
      }
    })

    // Bygg map: user_id -> antal rekryterade (inkl. nollor)
    const liga = Object.entries(räknare)
      .map(([user_id, antal]) => ({ user_id, namn: namnMap[user_id], antal }))
      .sort((a, b) => b.antal - a.antal)

    // Returnera också en map för snabb lookup i Participants
    const rekMap = {}
    Object.entries(räknare).forEach(([user_id, antal]) => {
      rekMap[user_id] = antal
    })

    return new Response(JSON.stringify({ liga, rekMap }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[rekrytering]', err)
    return new Response(JSON.stringify({ error: 'Kunde inte hämta rekryteringsligan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}