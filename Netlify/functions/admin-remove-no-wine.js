/**
 * admin-remove-no-wine.js
 *
 * Scheduled function — runs 11 June 2026 at 16:00 CEST (14:00 UTC).
 * Removes users who have not registered a wine bottle from the Användare sheet.
 *
 * A user is considered to have registered wine if they have a row in the Viner
 * sheet with a non-empty vin_namn (column C).
 *
 * Rows are deleted from bottom to top to preserve correct sheet indices.
 * The removed users are logged for audit purposes.
 */

import { getSheets, getRows, SHEET_ID } from './_sheets.js'
import { GRUPPSPEL_DEADLINE } from './_settings.js'

export default async (req) => {
  // Safety guard: only run on or after the deadline
  if (new Date() < GRUPPSPEL_DEADLINE) {
    console.log('[admin-remove-no-wine] Deadline har inte passerats ännu — avbryter.')
    return new Response(
      JSON.stringify({ message: 'Deadline ej passerad, ingen åtgärd.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const sheets = await getSheets()

    const [användareRader, vinerRader] = await Promise.all([
      getRows(sheets, 'Användare!A2:F1000'), // A=user_id, B=namn, C=email, D=hash, E=skapad, F=rekryterad_av
      getRows(sheets, 'Viner!A2:C1000'),     // A=user_id, B=namn, C=vin_namn
    ])

    // Build set of user_ids with registered wine
    const usersWithWine = new Set(
      vinerRader
        .filter((r) => r[0] && r[2] && r[2].trim())
        .map((r) => r[0].trim())
    )

    // Find indices (0-based in data array) of users WITHOUT wine
    const indicesAttTaBort = []
    const borttagna = []

    användareRader.forEach((r, i) => {
      const uid = (r[0] || '').trim()
      if (!uid) return
      if (!usersWithWine.has(uid)) {
        indicesAttTaBort.push(i)
        borttagna.push({ user_id: uid, namn: r[1], email: r[2] })
      }
    })

    if (indicesAttTaBort.length === 0) {
      console.log('[admin-remove-no-wine] Alla användare har registrerat vinflaska — ingen åtgärd.')
      return new Response(
        JSON.stringify({ removed: 0, message: 'Alla har registrerat vinflaska.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-remove-no-wine] Tar bort:', JSON.stringify(borttagna))

    // Get the numeric sheetId for "Användare"
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const sheetMeta = spreadsheet.data.sheets.find(
      (s) => s.properties.title === 'Användare'
    )
    if (!sheetMeta) throw new Error('Hittade inte fliken "Användare" i Google Sheet.')
    const sheetId = sheetMeta.properties.sheetId

    // Convert data indices to sheet row indices (data[0] = row 1 in 0-based API, row 2 in sheet)
    // Sheet row index (0-based): header = 0, first data row = 1
    const sheetRowIndices = indicesAttTaBort.map((i) => i + 1)

    // Delete rows from bottom to top to keep indices valid
    const requests = sheetRowIndices
      .sort((a, b) => b - a)
      .map((rowIdx) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIdx,
            endIndex: rowIdx + 1,
          },
        },
      }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    })

    console.log(`[admin-remove-no-wine] Tog bort ${borttagna.length} användare utan vinflaska.`)

    return new Response(
      JSON.stringify({
        removed: borttagna.length,
        users: borttagna,
        message: `${borttagna.length} användare utan vinflaska har tagits bort.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[admin-remove-no-wine] FEL:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
