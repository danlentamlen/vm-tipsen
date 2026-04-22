import { getSettings } from './_settings.js'

export default async (req) => {
  try {
    const settings = await getSettings()
    return new Response(
      JSON.stringify({
        tips_låst: settings.tips_låst === 'true',
        lås_datum: settings.lås_datum || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Något gick fel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}