import test from 'node:test'
import assert from 'node:assert/strict'
import scholarships from './scholarships.js'
import { isDue, toMillis, pickMatches, buildEmail, formatAmount, formatDeadline, escapeHtml, MAX_ITEMS } from './digest-lib.js'

const today = new Date('2026-09-20T12:00:00')
const profile = {
  majors: ['computer science'], year_level: 'junior', gpa: 3.6, state: 'MI',
  school: 'Michigan Technological University', age: 21, citizenship: 'us_citizen',
  affiliations: ['SASE', 'first-generation'], skills: ['python'], interests: ['networking'], work_experience: [],
}

test('isDue: never emailed -> due', () => {
  assert.equal(isDue(undefined, Date.now(), 1), true)
  assert.equal(isDue(null, Date.now(), 10080), true)
})

test('isDue: respects the minimum gap (Firestore Timestamp, Date and number all work)', () => {
  const now = Date.UTC(2026, 8, 20, 12, 0, 0)
  const fiveMinAgo = now - 5 * 60000
  assert.equal(isDue({ toMillis: () => fiveMinAgo }, now, 10), false)
  assert.equal(isDue({ toMillis: () => fiveMinAgo }, now, 5), true)
  assert.equal(isDue(new Date(fiveMinAgo), now, 10), false)
  assert.equal(isDue(fiveMinAgo, now, 10), false)
  assert.equal(isDue({ seconds: fiveMinAgo / 1000 }, now, 10), false)
})

test('isDue: a weekly gap blocks a 3 day old email but allows an 8 day old one', () => {
  const now = Date.UTC(2026, 8, 20)
  assert.equal(isDue(now - 3 * 86400000, now, 10080), false)
  assert.equal(isDue(now - 8 * 86400000, now, 10080), true)
})

test('isDue: 0 means always send; a 60 second gap tolerates small clock drift', () => {
  const now = Date.now()
  assert.equal(isDue(now, now, 0), true)
  assert.equal(isDue(now - 55000, now, 1), true) // 5s short of a minute, within the slack
  assert.equal(isDue(now - 20000, now, 1), false)
})

test('toMillis: unknown shapes give null', () => {
  assert.equal(toMillis('yesterday'), null)
  assert.equal(toMillis({}), null)
})

test('pickMatches: at most MAX_ITEMS, confirmed matches only', () => {
  const picks = pickMatches(scholarships, profile, { today })
  assert.ok(picks.length > 0 && picks.length <= MAX_ITEMS)
  for (const m of picks) assert.notEqual(m.eligibility && m.eligibility.status, 'needs_info')
})

test('buildEmail: subject, amounts (no more blank amount_display), links, disclaimer', () => {
  const picks = pickMatches(scholarships, profile, { today })
  const { subject, text, html } = buildEmail({ name: 'Max Wood', matches: picks, siteUrl: 'https://example.web.app/', today })
  assert.match(subject, /best scholarship match/)
  assert.match(text, /^Hi Max,/)
  assert.match(text, /\$\d/)
  assert.match(text, /may be eligible/i)
  assert.match(text, /can't guarantee/i)
  assert.match(text, /https:\/\/example\.web\.app\/dashboard\.html/)
  assert.match(html, /Official page/)
})

test('buildEmail: escapes HTML and drops non-http links', () => {
  const evil = [{
    scholarship: { id: 1, name: '<script>alert(1)</script>', sponsor: 'A & B', source_url: 'javascript:alert(1)', deadline: null, recurring: true },
    score: 1, reasons: ['<b>x</b>'],
  }]
  const { html } = buildEmail({ name: '<img src=x>', matches: evil, siteUrl: 'https://x.test', today })
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img src=x>'))
  assert.ok(!html.includes('<b>x</b>'))
  assert.ok(!html.includes('javascript:'))
  assert.equal(escapeHtml(`"'&<>`), '&quot;&#39;&amp;&lt;&gt;')
})

test('formatAmount / formatDeadline', () => {
  assert.equal(formatAmount({ amount_min: 1000, amount_max: 5000 }), '$1,000–$5,000')
  assert.equal(formatAmount({ amount_min: 10000, amount_max: 10000 }), '$10,000')
  assert.equal(formatAmount({}), '')
  assert.match(formatDeadline({ deadline: '2026-09-25' }, today), /Due in 5 days/)
  assert.equal(formatDeadline({ deadline: null, recurring: true }, today), 'Rolling / annual')
})
