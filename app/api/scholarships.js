/*
 * Serverless proxy: GET /api/scholarships?q=<keyword>&limit=<n>[&debug=1]
 *
 * Holds the CareerOneStop token server-side and returns normalised rows to the
 * client. Works as a Vercel/Netlify function (default export handler) AND is
 * mounted into the Vite dev server (see vite.config.js) so the same code runs
 * locally. Never exposes the token to the browser.
 *
 * Env required on the server:
 *   CAREERONESTOP_USERID, CAREERONESTOP_TOKEN
 */
import { fetchScholarships } from './_careeronestop.js'

export default async function handler(req, res) {
  const query = getQuery(req)
  const q = String(query.q || '')
  const limit = Number(query.limit) || 50
  const debug = query.debug

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=300') // 5 min edge/browser cache

  const userId = process.env.CAREERONESTOP_USERID
  const token = process.env.CAREERONESTOP_TOKEN
  if (!userId || !token) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Server missing CAREERONESTOP_USERID / CAREERONESTOP_TOKEN' }))
    return
  }

  try {
    const { scholarships, sample_raw } = await fetchScholarships({ q, limit, userId, token })
    const withIds = scholarships.map((s, i) => ({ id: 100000 + i, ...s }))
    const body = {
      source: 'careeronestop',
      fetched_at: new Date().toISOString().slice(0, 10),
      count: withIds.length,
      scholarships: withIds,
    }
    if (debug) body.sample_raw = sample_raw
    res.statusCode = 200
    res.end(JSON.stringify(body))
  } catch (err) {
    res.statusCode = err.status || 502
    res.end(JSON.stringify({ error: String(err.message || err) }))
  }
}

// Works with both Vercel (req.query populated) and Node/connect (parse req.url).
function getQuery(req) {
  if (req.query) return req.query
  try {
    const url = new URL(req.url, 'http://localhost')
    return Object.fromEntries(url.searchParams)
  } catch {
    return {}
  }
}
