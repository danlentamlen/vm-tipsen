import { getMatcher } from './_lockedData.js'

export default async () => {
  try {
    // Matcher-arket är låst — serveras ur persistent cache (överlever cold starts)
    const rader = await getMatcher()
    const matcher = rader.map((rad) => ({
      match_id: rad[0],
      datum:    rad[1],
      tid:      rad[2],
      hemmalag: rad[3],
      bortalag: rad[4],
      grupp:    rad[5],
      omgång:   rad[6],
      arena:    rad[7],
    }))

    return new Response(JSON.stringify(matcher), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, must-revalidate', // 5 min — knockout-namn uppdateras löpande
      },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Något gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}