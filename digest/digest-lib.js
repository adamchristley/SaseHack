// Pure helpers for the scholarship digest: who is due, which matches to send, what the email says.
// No network and no Firebase in here, so it can be unit-tested (digest-lib.test.js).
import { matchScholarships } from './matching.js'

export const MAX_ITEMS = 5

// Where the "manage your emails" link goes (the app's page, Account tab).
export const APP_PATH = '/dashboard.html'

// ---- who is due ------------------------------------------------------------

// Firestore hands back Timestamp objects; accept those, Dates, and plain numbers.
export function toMillis(value) {
  if (value == null) return null
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  return null
}

const CLOCK_SLACK_MS = 15000 // runner clock vs Google's clock can differ by a few seconds

// True if this user hasn't been emailed within the last `minMinutes` minutes.
// minMinutes = 0 means "always send" (handy for testing).
export function isDue(lastSent, now = Date.now(), minMinutes = 10080) {
  if (!(minMinutes > 0)) return true
  const last = toMillis(lastSent)
  if (last == null) return true
  return now - last >= minMinutes * 60000 - CLOCK_SLACK_MS
}

// ---- what to send ----------------------------------------------------------

// Confirmed matches only. Rows that still "need info" are left out so we never
// tell someone they may qualify for something we couldn't actually check.
export function pickMatches(scholarships, profile, { limit = MAX_ITEMS, today = new Date() } = {}) {
  return matchScholarships(scholarships, profile, { limit: 1000, today })
    .filter((m) => !m.eligibility || m.eligibility.status === 'eligible')
    .slice(0, limit)
}

// ---- formatting ------------------------------------------------------------

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])

// Only http(s) links go into the email.
const safeUrl = (url) => (/^https?:\/\//i.test(String(url || '')) ? String(url) : '')

const dollars = (n) => '$' + Number(n).toLocaleString('en-US')

export function formatAmount(s) {
  const min = s.amount_min
  const max = s.amount_max
  if (!min && !max) return ''
  if (min && max && min !== max) return `${dollars(min)}–${dollars(max)}`
  return dollars(max || min)
}

export function formatDeadline(s, today = new Date()) {
  if (!s.deadline) return s.recurring ? 'Rolling / annual' : 'No deadline listed'
  const due = new Date(s.deadline + 'T00:00:00')
  const days = Math.round((due - new Date(today.toDateString())) / 86400000)
  if (Number.isNaN(days)) return 'Check the official page for the deadline'
  const nice = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (days < 0) return 'Reopens annually — check the official page'
  if (days === 0) return `Due today (${nice})`
  if (days <= 14) return `Due in ${days} day${days === 1 ? '' : 's'} (${nice})`
  return `Due ${nice}`
}

export function buildEmail({ name, matches, siteUrl, today = new Date() }) {
  const first = String(name || '').trim().split(/\s+/)[0]
  const count = matches.length
  const subject = `Your ${count} best scholarship match${count === 1 ? '' : 'es'} this week`
  const appUrl = `${String(siteUrl || '').replace(/\/$/, '')}${APP_PATH}`
  const hello = first ? `Hi ${first},` : 'Hi,'
  const intro = "Here are the scholarships you may be eligible for, based on the profile you saved."
  const disclaimer = "Matches use the facts in your saved profile. Requirements and deadlines change, so confirm them on the official page before you apply. We can't guarantee you'll qualify."
  const footer = `You're getting this because you opted in on Charge Up Savings. To turn it off, open ${appUrl}, go to the Account tab, and untick the email box.`

  const items = matches.map((m) => {
    const s = m.scholarship
    return {
      name: s.name,
      sponsor: s.sponsor || '',
      amount: formatAmount(s),
      deadline: formatDeadline(s, today),
      reasons: (m.reasons || []).slice(0, 3),
      url: safeUrl(s.source_url),
    }
  })

  const text = [
    hello, '', intro, '',
    ...items.flatMap((it, i) => [
      `${i + 1}. ${it.name}${it.sponsor ? ` (${it.sponsor})` : ''}`,
      [it.amount, it.deadline].filter(Boolean).join(' · '),
      ...it.reasons.map((r) => `   - ${r}`),
      it.url ? `   Official page: ${it.url}` : '',
      '',
    ]),
    disclaimer, '', footer,
  ].join('\n')

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;">
<div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#16181d;line-height:1.5;">
  <p style="margin:0 0 8px;font-size:16px;">${escapeHtml(hello)}</p>
  <p style="margin:0 0 20px;font-size:15px;color:#444;">${escapeHtml(intro)}</p>
${items.map((it) => `  <div style="background:#ffffff;border:1px solid #e2e4e9;border-radius:10px;padding:16px;margin:0 0 14px;">
    <div style="font-size:17px;font-weight:bold;">${escapeHtml(it.name)}</div>
    ${it.sponsor ? `<div style="font-size:13px;color:#6b7280;">${escapeHtml(it.sponsor)}</div>` : ''}
    <div style="margin:8px 0;font-size:14px;"><strong>${escapeHtml(it.amount)}</strong>${it.amount ? ' · ' : ''}${escapeHtml(it.deadline)}</div>
    ${it.reasons.length ? `<ul style="margin:8px 0;padding-left:18px;font-size:14px;color:#333;">${it.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
    ${it.url ? `<a href="${escapeHtml(it.url)}" style="font-size:14px;font-weight:bold;color:#1a5fb4;">Official page</a>` : ''}
  </div>`).join('\n')}
  <p style="margin:20px 0 8px;font-size:12px;color:#6b7280;">${escapeHtml(disclaimer)}</p>
  <p style="margin:0;font-size:12px;color:#6b7280;">You're getting this because you opted in on Charge Up Savings. To turn it off, <a href="${escapeHtml(appUrl)}" style="color:#6b7280;">open the app</a>, go to the Account tab, and untick the email box.</p>
</div>
</body></html>`

  return { subject, text, html }
}
