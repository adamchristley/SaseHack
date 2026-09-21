import { onRequest } from 'firebase-functions/v2/https'
import resumeAnalyze from './resume-analyze.js'
import semanticRank from './semantic-rank.js'

const FUNCTION_OPTIONS = {
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 3,
  invoker: 'public',
  secrets: ['GEMINI_API_KEY'],
}

export const api = onRequest(FUNCTION_OPTIONS, async (req, res) => {
  const pathname = requestPath(req)

  if (pathname.endsWith('/resume-analyze')) {
    return resumeAnalyze(req, res)
  }

  if (pathname.endsWith('/semantic-rank')) {
    return semanticRank(req, res)
  }

  return res.status(404).json({ error: 'API route not found.' })
})

function requestPath(req) {
  if (typeof req.path === 'string' && req.path) return req.path

  try {
    return new URL(req.originalUrl || req.url || '/', 'http://localhost').pathname
  } catch {
    return '/'
  }
}
