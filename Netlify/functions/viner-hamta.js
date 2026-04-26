import { getSheets, getRows } from './_sheets.js'

async function hämtaOgImage(url) {
  if (!url || !url.includes('systembolaget.se')) return null
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'sv-SE,sv;q=0.9',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]?.startsWith('http')) return match[1]
    }
    return null
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

    // Kolumner: A=user_id, B=namn, C=vin_namn, D=vin_url, E=vin_pris, F=betalt, G=bild_url
    const rader = await getRows(sheets, 'Viner!A2:G1000')

    console.log(`[viner-hamta] ${rader.length} rader. Första:`, JSON.stringify(rader[0] ?? []))

    const uppdateringar = []

    const viner = await Promise.all(
      rader.map(async (r, i) => {
        const vin_url = (r[3] || '').trim()
        let bild_url = (r[6] || '').trim()

        if (vin_url && !bild_url) {
          const scrapad = await hämtaOgImage(vin_url)
          if (scrapad) {
            bild_url = scrapad
            uppdateringar.push({ rowIndex: i, bild_url })
          }
        }

        return {
          user_id:  (r[0] || '').trim(),
          namn:     (r[1] || '').trim(),
          vin_namn: (r[2] || '').trim(),
          vin_url,
          vin_pris: (r[4] || '').trim(),
          betalt:   (r[5] || 'ej_betalt').trim(),
          bild_url,
        }
      })
    )

    if (uppdateringar.length > 0) {
      await Promise.all(
        uppdateringar.map(({ rowIndex, bild_url }) =>
          sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Viner!G${rowIndex + 2}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[bild_url]] },
          })
        )
      )
    }

    return new Response(JSON.stringify(viner), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[viner-hamta] FEL:', err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}