import { getSheets, getMultipleRanges } from './_sheets.js'
import { gruppspelLåst } from './_settings.js'
import { dedupliceraTips, dedupliceraSvar } from './_scoring.js'

/**
 * Bygger en namn-uppslagning user_id → namn från Användare-arket.
 * Användare: A=user_id, B=namn.
 */
export function byggNamnMap(användareRader = []) {
  const map = {}
  for (const rad of användareRader) {
    if (rad && rad[0]) map[rad[0]] = rad[1] || 'Okänd'
  }
  return map
}

/**
 * Ren aggregering av matchtips → fördelning per resultat, MED namnen på dem
 * som tippat varje resultat. Förväntar sig redan deduplicerade tipsrader
 * (en rad per user_id) så ingen dubbelräknas och inget namn syns två gånger.
 *
 * @param {Array[]} matchTips  deduplicerade Tips-rader [tip_id,user_id,match_id,hemma,borta]
 * @param {Object}  namnMap    user_id → namn
 * @returns {{ totalt:number, fördelning:Array<{resultat,antal,procent,namn:string[]}> }}
 */
export function byggMatchFördelning(matchTips = [], namnMap = {}) {
  const totalt = matchTips.length
  if (totalt === 0) return { totalt: 0, fördelning: [] }

  const grupper = {}
  for (const rad of matchTips) {
    const nyckel = `${rad[3]}-${rad[4]}`
    ;(grupper[nyckel] ||= []).push(namnMap[rad[1]] || 'Okänd')
  }

  const fördelning = Object.entries(grupper)
    .map(([resultat, namn]) => ({
      resultat,
      antal: namn.length,
      procent: Math.round((namn.length / totalt) * 100),
      namn: namn.sort((a, b) => a.localeCompare(b, 'sv')),
    }))
    .sort((a, b) => b.antal - a.antal || a.resultat.localeCompare(b.resultat))

  return { totalt, fördelning }
}

/**
 * Ren aggregering av frågesvar → fördelning per svar, med namn per svar.
 * Förväntar sig deduplicerade svarsrader (en rad per user_id).
 *
 * @param {Array[]} frågorSvar  deduplicerade FrågorSvar-rader [id,user_id,fråga_id,svar]
 * @param {Object}  namnMap     user_id → namn
 */
export function byggFrågeFördelning(frågorSvar = [], namnMap = {}) {
  const totalt = frågorSvar.length
  if (totalt === 0) return { totalt: 0, fördelning: [] }

  const grupper = {}
  for (const rad of frågorSvar) {
    const svar = rad[3] || '–'
    ;(grupper[svar] ||= []).push(namnMap[rad[1]] || 'Okänd')
  }

  const fördelning = Object.entries(grupper)
    .map(([resultat, namn]) => ({
      resultat,
      antal: namn.length,
      procent: Math.round((namn.length / totalt) * 100),
      namn: namn.sort((a, b) => a.localeCompare(b, 'sv')),
    }))
    .sort((a, b) => b.antal - a.antal || a.resultat.localeCompare(b.resultat))

  return { totalt, fördelning }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export default async (req) => {
  try {
    // Tipsfördelning visas bara när tips är låsta
    if (!gruppspelLåst()) {
      return json({ error: 'Tips är inte låsta än' }, 403)
    }

    const sheets = await getSheets()
    const url = new URL(req.url)
    const match_id = url.searchParams.get('match_id')
    const fråga_id = url.searchParams.get('fråga_id')

    if (!match_id && !fråga_id) {
      return json({ error: 'match_id eller fråga_id krävs' }, 400)
    }

    // Fördelning för en match
    if (match_id) {
      const [tipsRader, användareRader] = await getMultipleRanges(sheets, [
        'Tips!A2:E100000',
        'Användare!A2:B1000',
      ])
      const namnMap = byggNamnMap(användareRader)
      const matchTips = dedupliceraTips(tipsRader).filter((rad) => rad[2] === match_id)
      return json(byggMatchFördelning(matchTips, namnMap))
    }

    // Fördelning för en fråga
    const [svarRader, användareRader] = await getMultipleRanges(sheets, [
      'FrågorSvar!A2:D100000',
      'Användare!A2:B1000',
    ])
    const namnMap = byggNamnMap(användareRader)
    const frågorSvar = dedupliceraSvar(svarRader).filter((rad) => rad[2] === fråga_id)
    return json(byggFrågeFördelning(frågorSvar, namnMap))
  } catch (err) {
    console.error(err)
    return json({ error: 'Något gick fel' }, 500)
  }
}
