import { getSheets, getRows } from './_sheets.js'

async function hämtaOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VM-tipsen/1.0)',
      },
    })
    const html = await res.text()
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const sheets = await getSheets()
    const rader = await getRows(sheets, 'Viner!A2:G1000')

    const uppdateringar = []

    const viner = await Promise.all(
      rader.map(async (r, i) => {
        const vin_url = r[3] || ''
        let bild_url = r[6] || ''

        // Om vi har en URL men ingen cachad bild — scrapa
        if (vin_url && !bild_url) {
          bild_url = (await hämtaOgImage(vin_url)) || ''
          if (bild_url) {
            uppdateringar.push({ rowIndex: i, bild_url })
          }
        }

        return {
          user_id: r[0] || '',
          namn: r[1] || '',
          vin_namn: r[2] || '',
          vin_url,
          vin_pris: r[4] || '',
          betalt: r[5] || 'ej_betalt',
          bild_url,
        }
      })
    )

    // Cacha nya bilder i kolumn G
    if (uppdateringar.length > 0) {
      await Promise.all(
        uppdateringar.map(({ rowIndex, bild_url }) => {
          const rowNumber = rowIndex + 2
          return sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Viner!G${rowNumber}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[bild_url]] },
          })
        })
      )
    }

    return new Response(JSON.stringify(viner), {
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