/**
 * test-sofascore.js — Temporär testfunktion för att verifiera att
 * Sofascore-API:t fungerar från Netlify (körs INTE lokalt pga proxy-block).
 *
 * Anropa via: https://<din-site>.netlify.app/.netlify/functions/test-sofascore
 * Ta bort filen när testet är klart.
 */

const WC_TOURNAMENT_ID = 16

export default async () => {
  const results = {}

  // Test 1: live-matcher
  try {
    const res = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Netlify-Function/1.0)',
        'Accept': 'application/json',
      }
    })
    results.liveStatus = res.status
    if (res.ok) {
      const data = await res.json()
      const wc = (data.events || []).filter(e => e.tournament?.uniqueTournament?.id === WC_TOURNAMENT_ID)
      results.totalLive = data.events?.length
      results.wcLive = wc.map(e => ({
        home: e.homeTeam?.name,
        away: e.awayTeam?.name,
        hs: e.homeScore?.current,
        as_: e.awayScore?.current,
        status: e.status?.description,
        min: e.time?.played,
        inj: e.time?.injuryTime1,
      }))
    } else {
      results.liveError = await res.text()
    }
  } catch (err) {
    results.liveException = err.message
  }

  // Test 2: dagens matcher
  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Netlify-Function/1.0)',
        'Accept': 'application/json',
      }
    })
    results.todayStatus = res.status
    if (res.ok) {
      const data = await res.json()
      const wc = (data.events || []).filter(e => e.tournament?.uniqueTournament?.id === WC_TOURNAMENT_ID)
      results.wcToday = wc.map(e => ({
        home: e.homeTeam?.name,
        away: e.awayTeam?.name,
        hs: e.homeScore?.current,
        as_: e.awayScore?.current,
        status: e.status?.description,
        kickoff: new Date(e.startTimestamp * 1000).toISOString(),
        min: e.time?.played,
      }))
    } else {
      results.todayError = await res.text()
    }
  } catch (err) {
    results.todayException = err.message
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
