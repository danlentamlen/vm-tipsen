import { getSheets, getRows } from './_sheets.js'

export default async (req) => {
  try {
    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Matcher!A2:H1000')

    const matcher = rader.map((rad) => ({
      match_id: rad[0],
      datum: rad[1],
      tid: rad[2],
      hemmalag: rad[3],
      bortalag: rad[4],
      grupp: rad[5],
      omgång: rad[6],
      arena: rad[7],
    }))

    return new Response(JSON.stringify(matcher), {
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