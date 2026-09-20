import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const api = spawn(process.execPath, ['scripts/local-api.mjs'], {
  stdio: 'inherit',
  env: process.env,
})

const vite = spawn(npmCommand, ['run', 'dev'], {
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

api.on('exit', (code) => {
  if (!shuttingDown && code !== 0) shutdown(code || 1)
})

vite.on('exit', (code) => {
  if (!shuttingDown) shutdown(code || 0)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
