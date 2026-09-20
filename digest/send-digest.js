/*
 * Scheduled "best scholarship matches" email digest — run by GitHub Actions
 * instead of Firebase Cloud Functions, so it never needs Blaze billing.
 *
 * Connects to your same Firestore database from outside Google Cloud using
 * a service account key. Firestore doesn't care where the request comes
 * from; only running code INSIDE Google Cloud (Cloud Functions) needs
 * Blaze — reading/writing Firestore itself does not.
 *
 * SETUP:
 *   1. Firebase Console -> Project Settings (gear icon) -> Service Accounts
 *      -> "Generate new private key" -> downloads a JSON file.
 *   2. In your GitHub repo: Settings -> Secrets and variables -> Actions ->
 *      New repository secret. Name: FIREBASE_SERVICE_ACCOUNT
 *      Value: paste the ENTIRE contents of that downloaded JSON file.
 *   3. Add two more secrets the same way:
 *      GMAIL_USER          (your Gmail address that sends the digest)
 *      GMAIL_APP_PASSWORD  (the 16-character app password, not your real password)
 *   4. Copy your actual src/lib/matching.js and src/data/scholarships.js
 *      into this same digest/ folder, exactly as-is, no changes needed.
 */
import admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import { matchScholarships } from './matching.js'
import scholarships from './scholarships.js'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

function buildEmail(matches) {
  const lines = matches.map((m, i) =>
    `${i + 1}. ${m.scholarship.name} — ${m.scholarship.amount_display || ''}\n` +
    `   ${m.reasons.join('; ')}\n` +
    `   ${m.scholarship.source_url}`
  )
  const text =
    `Here are your best-matching scholarships this week:\n\n${lines.join('\n\n')}\n\n` +
    `You're getting this because you opted in on Charge Up Savings. ` +
    `Turn it off any time in your Account tab.`
  const html =
    `<p>Here are your best-matching scholarships this week:</p><ol>` +
    matches.map((m) =>
      `<li><strong>${m.scholarship.name}</strong> — ${m.scholarship.amount_display || ''}<br>` +
      `${m.reasons.join('; ')}<br>` +
      `<a href="${m.scholarship.source_url}">${m.scholarship.source_url}</a></li>`
    ).join('') +
    `</ol><p style="color:#888;font-size:13px">You're getting this because you opted in on ` +
    `Charge Up Savings. Turn it off any time in your Account tab.</p>`
  return { text, html }
}

async function main() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  const optedInSnap = await db.collection('users').where('emailOptIn', '==', true).get()
  console.log(`Found ${optedInSnap.size} opted-in user(s).`)

  for (const docSnap of optedInSnap.docs) {
    const uid = docSnap.id
    const data = docSnap.data()
    const profile = data.profile

    if (!profile) {
      console.log(`Skipping ${uid} — no saved profile yet.`)
      continue
    }

    const matches = matchScholarships(scholarships, profile, { limit: 5 })
    if (matches.length === 0) {
      console.log(`Skipping ${uid} — no matches for current profile.`)
      continue
    }

    let email
    try {
      const userRecord = await admin.auth().getUser(uid)
      email = userRecord.email
    } catch (err) {
      console.error(`Could not look up auth email for ${uid}:`, err.message)
      continue
    }
    if (!email) continue

    const { text, html } = buildEmail(matches)
    try {
      await transporter.sendMail({
        from: `Charge Up Savings <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Your ${matches.length} best scholarship matches this week`,
        text,
        html,
      })
      console.log(`Sent digest to ${email}`)
    } catch (err) {
      console.error(`Failed to send to ${email}:`, err.message)
    }
  }
}

main().catch((err) => {
  console.error('Digest run failed:', err)
  process.exit(1)
})
