import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

const api = spawn(process.execPath, ['scripts/local-api.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

const vite = spawn(process.execPath, [viteBin], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true

  if (!api.killed) api.kill()
  if (!vite.killed) vite.kill()

  setTimeout(() => process.exit(code), 100)
}

api.on('error', (error) => {
  console.error('Failed to start local API:', error)
  shutdown(1)
})

vite.on('error', (error) => {
  console.error('Failed to start Vite:', error)
  shutdown(1)
})

api.on('exit', (code) => {
  if (!shuttingDown && code !== 0) shutdown(code || 1)
})

vite.on('exit', (code) => {
  if (!shuttingDown) shutdown(code || 0)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
