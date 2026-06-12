import { getSheets, getRows, getMultipleRanges } from './_sheets.js'
import { withCache } from './_cache.js'
import { räknaMatchPoäng, dedupliceraTips, dedupliceraSvar } from './_scoring.js'
import jwt from 'jsonwebtoken'

const LIST_TTL    = 15 * 60 * 1000  // participant list — 15 minutes
const PROFILE_TTL =  3 * 60 * 1000  // individual profile — 3 minutes

function verifyToken(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export default async (req) => {
  try {
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')

    // ── Hämta alla deltagare ────────────────────────────────
    if (!user_id) {
      const deltagare = await withCache('participants:list', LIST_TTL, async () => {
        const sheets = await getSheets()
        const användare = await getRows(sheets, 'Användare!A2:F1000')
        const rekMap = {}
        användare.forEach((rad) => {
          const rekryteradAv = rad[5]?.trim()
          if (rekryteradAv) rekMap[rekryteradAv] = (rekMap[rekryteradAv] || 0) + 1
        })
        return användare
          .filter(rad => rad[0])
          .map((rad) => ({
            user_id:           rad[0],
            namn:              rad[1],
            email:             rad[2],
            rekryterade_antal: rekMap[rad[0]] || 0,
            rekryterad_av:     rad[5]?.trim() || null,
          }))
      })

      return new Response(JSON.stringify(deltagare), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=900', // 15 minutes
        },
      })
    }

    // ── Hämta en deltagares profil ──────────────────────────
    const profil = await withCache(`participant:${user_id}`, PROFILE_TTL, async () => {
      const sheets = await getSheets()

      // One batchGet for all five ranges
      const [användareRader, matcherRader, resultatRader, tipsRader, frågorRader, frågorSvarRader] =
        await getMultipleRanges(sheets, [
          'Användare!A2:B1000',
          'Matcher!A2:H1000',
          'Resultat!A2:D1000',
          'Tips!A2:E100000',
          'Frågor!A2:E1000',
          'FrågorSvar!A2:D1000',
        ])

      const användareRad = användareRader.find((r) => r[0] === user_id)
      if (!användareRad) return null

      const matcherMap = {}
      matcherRader.forEach((rad) => {
        matcherMap[rad[0]] = {
          match_id: rad[0], datum: rad[1], tid: rad[2],
          hemmalag: rad[3], bortalag: rad[4], grupp: rad[5],
        }
      })

      const resultatMap = {}
      resultatRader.forEach((rad) => {
        if (rad[0]) resultatMap[rad[0]] = { hemma: rad[1], borta: rad[2] }
      })

      // Dedupe: Tips-arket kan ha flera rader per match (redigerat tips) — visa
      // bara senaste, annars dyker samma match upp flera gånger. Se [[dedupliceraTips]].
      const minaTips = dedupliceraTips(tipsRader.filter((rad) => rad[1] === user_id))
        .map((rad) => {
          const match   = matcherMap[rad[2]] || {}
          const resultat = resultatMap[rad[2]]
          const poäng = resultat
            ? räknaMatchPoäng(rad[3], rad[4], resultat.hemma, resultat.borta)
            : null
          return {
            match_id: rad[2],
            tip_hemma: rad[3], tip_borta: rad[4],
            resultat_hemma: resultat ? resultat.hemma : null,
            resultat_borta: resultat ? resultat.borta : null,
            poäng, ...match,
          }
        })

      const frågorMap = {}
      frågorRader.forEach((rad, i) => {
        if (rad[0]) frågorMap[rad[0]] = { fråga: rad[1], poäng: parseInt(rad[2]) || 0, rätt_svar: rad[4] || null, index: i + 1 }
      })

      const minaSvar = dedupliceraSvar(frågorSvarRader.filter((rad) => rad[1] === user_id))
        .map((rad) => {
          const fråga = frågorMap[rad[2]] || {}
          return {
            svar_id: rad[0], fråga_id: rad[2],
            fråga: fråga.fråga || null, fråga_nr: fråga.index || null,
            svar: rad[3], rätt_svar: fråga.rätt_svar || null,
          }
        })

      return { user_id, namn: användareRad[1], tips: minaTips, svar: minaSvar }
    })

    if (!profil) {
      return new Response(
        JSON.stringify({ error: 'Användaren hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(profil), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=180', // 3 minutes
      },
    })
  } catch (err) {
    console.error('[participants]', err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}