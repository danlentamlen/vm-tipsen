import { getSheets, getRows } from './_sheets.js'

export async function getSettings() {
  const sheets = await getSheets()
  const rader = await getRows(sheets, 'Inställningar!A2:B100')
  const settings = {}
  rader.forEach((rad) => {
    if (rad[0]) settings[rad[0]] = rad[1]
  })
  return settings
}

export async function setSetting(nyckel, värde) {
  const sheets = await getSheets()
  const rader = await getRows(sheets, 'Inställningar!A2:B100')
  const index = rader.findIndex((rad) => rad[0] === nyckel)

  if (index !== -1) {
    const radNummer = index + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Inställningar!B${radNummer}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[värde]] },
    })
  }
}