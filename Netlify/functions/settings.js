import { getSheets, getRows } from './_sheets.js'

// Reads key-value pairs from the Inställningar sheet
// Expected format: Column A = key, Column B = value
// e.g. swish_nummer | 123 456 78 90
export default async (req) => {
  try {
    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Inställningar!A2:B100')

    const inställningar = {}
    rader.forEach((rad) => {
      if (rad[0]) inställningar[rad[0].trim()] = rad[1]?.trim() || ''
    })

    return new Response(JSON.stringify(inställningar), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Kunde inte hämta inställningar' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}