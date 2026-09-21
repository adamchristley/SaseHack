import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import resumeAnalyze from '../api/resume-analyze.js'
import semanticRank from '../api/semantic-rank.js'
import scholarships from '../api/scholarships.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
loadEnv(path.join(root, '.env.local'))

const routes = new Map([
  ['/api/resume-analyze', resumeAnalyze],
  ['/api/semantic-rank', semanticRank],
  ['/api/scholarships', scholarships],
])

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const handler = routes.get(url.pathname)

  if (!handler) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    req.body = await readJsonBody(req)
    decorateResponse(res)
    await handler(req, res)
  } catch (error) {
    console.error('Local API error:', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: 'Local API request failed.' }))
    }
  }
})

const port = Number(process.env.LOCAL_API_PORT || 8787)
server.listen(port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${port}`)
})

function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }

  res.json = (payload) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify(payload))
    return res
  }
}

async function readJsonBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}

  try {
    return JSON.parse(raw)
  } catch {
    const error = new Error('Invalid JSON body')
    error.statusCode = 400
    throw error
  }
}

function loadEnv(filename) {
  if (!fs.existsSync(filename)) {
    console.warn('No .env.local found. Gemini and national-database features will use local fallback mode.')
    return
  }

  const text = fs.readFileSync(filename, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equals = line.indexOf('=')
    if (equals <= 0) continue

    const key = line.slice(0, equals).trim()
    let value = line.slice(equals + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = value
  }
}
