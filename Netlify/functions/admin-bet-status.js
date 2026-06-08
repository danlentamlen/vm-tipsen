/**
 * admin-bet-status.js
 *
 * Returns bet completion stats per participant:
 * - groupBetPct:    % of group stage matches where a tip has been set
 * - questionPct:    % of bonus questions answered
 * - knockoutRounds: object with pct per knockout round name
 *
 * Auth: Bearer admin secret required.
 */
import { getSheets, getRows } from './_sheets.js'

const KNOCKOUT_ROUNDS = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
]

function verifyAdmin(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return false
  return auth.replace('Bearer ', '') === process.env.ADMIN_SECRET
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (!verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Ej behörig' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sheets = await getSheets()

    const [
      användareRader,
      matcherRader,
      tipsRader,
      frågorRader,
      frågorSvarRader,
    ] = await Promise.all([
      getRows(sheets, 'Användare!A2:C1000'),     // user_id, namn, email
      getRows(sheets, 'Matcher!A2:G1000'),        // match_id, datum, tid, hemma, borta, grupp, omgång
      getRows(sheets, 'Tips!A2:E100000'),         // tip_id, user_id, match_id, hemma_mål, borta_mål
      getRows(sheets, 'Frågor!A2:A1000'),         // fråga_id, ...
      getRows(sheets, 'FrågorSvar!A2:C100000'),   // svar_id, user_id, fråga_id, ...
    ])

    // Build user map
    const användare = användareRader
      .filter((r) => r[0])
      .map((r) => ({ user_id: r[0], namn: r[1], email: r[2] }))

    // Categorise matches
    const gruppspelsMatcher = matcherRader.filter(
      (r) => r[0] && (!r[6] || !KNOCKOUT_ROUNDS.includes(r[6]))
    )
    const totalGruppsmatcher = gruppspelsMatcher.length

    const knockoutMatcherPerRond = {}
    KNOCKOUT_ROUNDS.forEach((rond) => {
      knockoutMatcherPerRond[rond] = matcherRader.filter((r) => r[6] === rond).map((r) => r[0])
    })

    // Total questions
    const totalFrågor = frågorRader.filter((r) => r[0]).length

    // Index tips per user
    const tipsPerUser = {}
    tipsRader.forEach((r) => {
      const uid = r[1]
      const mid = r[2]
      if (!uid || !mid) return
      if (!tipsPerUser[uid]) tipsPerUser[uid] = new Set()
      tipsPerUser[uid].add(mid)
    })

    // Index question answers per user
    const svarPerUser = {}
    frågorSvarRader.forEach((r) => {
      const uid = r[1]
      const fid = r[2]
      if (!uid || !fid) return
      if (!svarPerUser[uid]) svarPerUser[uid] = new Set()
      svarPerUser[uid].add(fid)
    })

    // Build group match id set
    const gruppMatchIds = new Set(gruppspelsMatcher.map((r) => r[0]))

    // Compute stats per user
    const stats = användare.map((u) => {
      const uid = u.user_id
      const userTips = tipsPerUser[uid] || new Set()
      const userSvar = svarPerUser[uid] || new Set()

      // Group stage bets
      let groupBets = 0
      userTips.forEach((mid) => { if (gruppMatchIds.has(mid)) groupBets++ })
      const groupBetPct = totalGruppsmatcher > 0
        ? Math.round((groupBets / totalGruppsmatcher) * 100)
        : 0

      // Questions
      const questionPct = totalFrågor > 0
        ? Math.round((userSvar.size / totalFrågor) * 100)
        : 0

      // Knockout rounds
      const knockoutRounds = {}
      KNOCKOUT_ROUNDS.forEach((rond) => {
        const rondMatchIds = knockoutMatcherPerRond[rond]
        const total = rondMatchIds.length
        if (total === 0) {
          knockoutRounds[rond] = null // not yet scheduled
          return
        }
        const set = rondMatchIds.filter((mid) => userTips.has(mid)).length
        knockoutRounds[rond] = Math.round((set / total) * 100)
      })

      return {
        user_id: uid,
        namn: u.namn,
        email: u.email,
        groupBetPct,
        groupBets,
        totalGroupMatches: totalGruppsmatcher,
        questionPct,
        questionAnswered: userSvar.size,
        totalQuestions: totalFrågor,
        knockoutRounds,
      }
    })

    // Also return round totals for header summary
    const summary = {
      totalUsers: användare.length,
      totalGroupMatches: totalGruppsmatcher,
      totalQuestions: totalFrågor,
      knockoutMatchCounts: Object.fromEntries(
        KNOCKOUT_ROUNDS.map((r) => [r, knockoutMatcherPerRond[r].length])
      ),
    }

    return new Response(JSON.stringify({ stats, summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin-bet-status] FEL:', err)
    return new Response(JSON.stringify({ error: err.message || 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
