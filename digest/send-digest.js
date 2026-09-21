/*
 * Scholarship digest email, run by GitHub Actions (.github/workflows/scholarship-digest.yml).
 *
 * For every user with storeData == true and a saved profile, it emails their best
 * scholarship matches, but only if they haven't been emailed within MIN_MINUTES_BETWEEN
 * minutes (tracked in users/{uid}.lastDigestAt). That is what lets the workflow run often
 * without spamming anyone: the schedule decides when we LOOK, this decides who is DUE.
 *
 * Settings (environment variables):
 *   FIREBASE_SERVICE_ACCOUNT   the whole service-account JSON (GitHub secret)
 *   GMAIL_USER                 Gmail address that sends the mail (GitHub secret)
 *   GMAIL_APP_PASSWORD         16-character Gmail app password (GitHub secret)
 *   SITE_URL                   your site, used for the link in the email
 *   MIN_MINUTES_BETWEEN        default 10080 (one week). 0 = always send. 1 = at most once a minute.
 *   ONLY_EMAIL                 testing: only email this address, skip everyone else
 *   DRY_RUN                    "true" = print who would be emailed, send nothing
 *
 * Running it on your own computer:
 *   set FIREBASE_SERVICE_ACCOUNT_FILE=C:\path\to\key.json   (instead of FIREBASE_SERVICE_ACCOUNT)
 *   set GMAIL_USER=...   set GMAIL_APP_PASSWORD=...   set DRY_RUN=true
 *   node send-digest.js
 */
import admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import { readFileSync } from 'node:fs'
import scholarships from './scholarships.js'
import { isDue, pickMatches, buildEmail } from './digest-lib.js'

const DRY_RUN = process.env.DRY_RUN === 'true'
const MIN_MINUTES = process.env.MIN_MINUTES_BETWEEN === undefined || process.env.MIN_MINUTES_BETWEEN === ''
  ? 10080
  : Number(process.env.MIN_MINUTES_BETWEEN)
const ONLY_EMAIL = (process.env.ONLY_EMAIL || '').trim().toLowerCase()
const SITE_URL = process.env.SITE_URL || 'https://login-sasehack.web.app'

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function need(name, where = 'Settings > Secrets and variables > Actions') {
  const value = process.env[name]
  if (!value) fail(`${name} is not set. Add it under ${where}.`)
  return value
}

if (!Number.isFinite(MIN_MINUTES) || MIN_MINUTES < 0) fail('MIN_MINUTES_BETWEEN must be a number of minutes (0 or more).')

// ---- Firebase ------------------------------------------------------------
let serviceAccount
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
    ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8')
    : need('FIREBASE_SERVICE_ACCOUNT')
  serviceAccount = JSON.parse(raw)
} catch (err) {
  fail(`Could not read the Firebase key (${err.message}). Paste the ENTIRE contents of the downloaded .json file into the FIREBASE_SERVICE_ACCOUNT secret.`)
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ---- Gmail ---------------------------------------------------------------
let transporter = null
if (!DRY_RUN) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: need('GMAIL_USER'), pass: need('GMAIL_APP_PASSWORD') },
  })
  try {
    await transporter.verify() // fails fast with a clear reason if the login is wrong
  } catch (err) {
    fail(`Gmail login failed: ${err.message}. Check GMAIL_USER and that GMAIL_APP_PASSWORD is a Gmail APP password (needs 2-Step Verification), not your normal password.`)
  }
}

// ---- main ----------------------------------------------------------------
const mode = [DRY_RUN && 'DRY RUN', ONLY_EMAIL && 'test address only', `min ${MIN_MINUTES} min between emails`].filter(Boolean).join(', ')
console.log(`Digest run started (${mode}).`)

const snap = await db.collection('users').where('storeData', '==', true).get()
console.log(`Found ${snap.size} opted-in user(s).`)

let sent = 0
let skipped = 0
let failed = 0

for (const docSnap of snap.docs) {
  // If this repo is public the Actions log is public too, so log a short id, never an address.
  const label = docSnap.id.slice(0, 6) + '…'
  try {
    const data = docSnap.data()

    if (!data.profile) { skipped++; console.log(`${label}: skipped (no saved profile yet)`); continue }
    if (!isDue(data.lastDigestAt, Date.now(), MIN_MINUTES)) { skipped++; console.log(`${label}: skipped (emailed recently)`); continue }

    const account = await admin.auth().getUser(docSnap.id)
    if (!account.email || !account.emailVerified) { skipped++; console.log(`${label}: skipped (email not verified)`); continue }
    if (ONLY_EMAIL && account.email.toLowerCase() !== ONLY_EMAIL) { skipped++; console.log(`${label}: skipped (not the test address)`); continue }

    const matches = pickMatches(scholarships, data.profile)
    if (matches.length === 0) { skipped++; console.log(`${label}: skipped (no confirmed matches for this profile)`); continue }

    const { subject, text, html } = buildEmail({ name: account.displayName, matches, siteUrl: SITE_URL, profile: data.profile })

    if (DRY_RUN) {
      console.log(`${label}: would send "${subject}"`)
      matches.forEach((m) => console.log(`    - ${m.scholarship.name}`))
    } else {
      await transporter.sendMail({
        from: `Charge Up Savings <${process.env.GMAIL_USER}>`,
        to: account.email,
        subject,
        text,
        html,
      })
      // Only after a successful send, so a failure is retried on the next run.
      await docSnap.ref.update({ lastDigestAt: admin.firestore.FieldValue.serverTimestamp() })
      console.log(`${label}: sent ${matches.length} match(es)`)
    }
    sent++
  } catch (err) {
    failed++
    console.error(`${label}: FAILED - ${err.message}`)
  }
}

console.log(`Done. ${DRY_RUN ? 'would send' : 'sent'}: ${sent}, skipped: ${skipped}, failed: ${failed}`)
// A red X in the Actions tab is much easier to notice than a green check with errors buried in the log.
if (failed > 0) process.exitCode = 1
