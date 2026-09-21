import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Pure client-side SPA + one serverless proxy (api/scholarships.js) for the
// live national scholarship database. In production that file is a Vercel/
// Netlify function; in dev we mount the same handler here so `npm run dev`
// serves /api/scholarships too.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Make the server-only secrets available to the dev middleware via process.env.
  // These are NEVER exposed to the client (no VITE_ prefix, used server-side only).
  process.env.CAREERONESTOP_USERID = process.env.CAREERONESTOP_USERID || env.CAREERONESTOP_USERID || ''
  process.env.CAREERONESTOP_TOKEN = process.env.CAREERONESTOP_TOKEN || env.CAREERONESTOP_TOKEN || ''

  return {
    plugins: [react(), devApiPlugin()],
  }
})

function devApiPlugin() {
  return {
    name: 'dev-api-scholarships',
    configureServer(server) {
      server.middlewares.use('/api/scholarships', async (req, res) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/scholarships.js')
          await handler(req, res)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(err && err.message || err) }))
        }
      })
    },
  }
}
