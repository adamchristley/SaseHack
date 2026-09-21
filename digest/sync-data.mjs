// Copies the app's real scholarship data and matching rules into this folder, so the
// emails are always built from the same data the website uses (no stale second copy).
//   local:   npm run sync        GitHub: the workflow runs this before every send
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const appSrc = path.resolve(here, '../public/SaseHack-parker-data-matching/src')
const files = [
  ['data/scholarships.js', 'scholarships.js'],
  ['lib/matching.js', 'matching.js'],
]

let problem = false
for (const [from, to] of files) {
  const source = path.join(appSrc, from)
  if (!existsSync(source)) {
    console.error(`ERROR: missing ${source}`)
    problem = true
    continue
  }
  // These two files are copied on their own, so they must not import other files.
  if (/^\s*import\s[^\n]*from\s+['"]\./m.test(readFileSync(source, 'utf8'))) {
    console.error(`ERROR: ${from} now imports other files. Extend sync-data.mjs to copy them too.`)
    problem = true
    continue
  }
  copyFileSync(source, path.join(here, to))
  console.log(`synced ${to}  <-  src/${from}`)
}
if (problem) process.exit(1)
