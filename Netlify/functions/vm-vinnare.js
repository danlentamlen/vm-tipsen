import { getSheets, getRows } from './_sheets.js'

// Returns a map of { user_id -> svar } for all questions of type 'team'
// Used by the Participants page to show each user's VM winner pick
export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const sheets = await getSheets()

    // Get all questions to find team-type ones (VM winner questions)
    const frågor = await getRows(sheets, 'Frågor!A2:D1000')
    const teamFrågor = new Set(
      frågor
        .filter((rad) => (rad[3] || '').split('|')[0].trim() === 'team')
        .map((rad) => rad[0])
    )

    if (teamFrågor.size === 0) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get all answers and find the first team-type answer per user
    const svarRader = await getRows(sheets, 'FrågorSvar!A2:D1000')
    const vinnareMap = {}

    svarRader.forEach((rad) => {
      const user_id = rad[1]
      const fråga_id = rad[2]
      const svar = rad[3]
      if (teamFrågor.has(fråga_id) && svar && !vinnareMap[user_id]) {
        vinnareMap[user_id] = svar
      }
    })

    return new Response(JSON.stringify(vinnareMap), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}