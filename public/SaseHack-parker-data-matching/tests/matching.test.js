/*
 * Tests for the matching engine. The plan asks for these exact cases:
 *   - a GPA-gated scholarship excluding a lower-GPA profile
 *   - a NULL-majors row matching everyone
 *   - an expired non-recurring row dropping out
 * Plus the scam-fee rule and the reasons output.
 *
 * Run: npm test   (uses the built-in node:test runner, no deps)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEligible, matchScholarships, overlap } from '../src/lib/matching.js'

const base = {
  id: 0, name: 'X', source_url: 'https://example.edu', requires_fee: false,
  majors: [], min_gpa: null, year_levels: [], states: [], affiliations: [],
  keywords: [], deadline: null, recurring: true, amount_max: 1000,
}
const S = (o) => ({ ...base, ...o })

const csJunior = {
  majors: ['computer science'], year_level: 'junior', gpa: 3.6, state: 'MI',
  affiliations: ['SASE'], skills: ['python', 'docker'], interests: ['networking'],
}

test('overlap is case-insensitive and trimmed', () => {
  assert.deepEqual(overlap(['Computer Science'], [' computer science ']), ['Computer Science'])
  assert.deepEqual(overlap(['biology'], ['chemistry']), [])
})

test('GPA-gated scholarship excludes a lower-GPA profile', () => {
  const s = S({ min_gpa: 3.8 })
  assert.equal(isEligible(s, csJunior), false)
  assert.equal(isEligible(s, { ...csJunior, gpa: 3.9 }), true)
})

test('unknown GPA is never excluded by a GPA gate', () => {
  const s = S({ min_gpa: 3.8 })
  assert.equal(isEligible(s, { ...csJunior, gpa: null }), true)
})

test('NULL / empty majors row matches everyone', () => {
  const s = S({ majors: [] })
  assert.equal(isEligible(s, csJunior), true)
  assert.equal(isEligible(s, { majors: ['art history'] }), true)
})

test('major restriction excludes a non-matching major', () => {
  const s = S({ majors: ['biology', 'chemistry'] })
  assert.equal(isEligible(s, csJunior), false)
})

test('expired non-recurring row drops out; recurring survives', () => {
  const expired = S({ deadline: '2000-01-01', recurring: false })
  const expiredRecurring = S({ deadline: '2000-01-01', recurring: true })
  assert.equal(isEligible(expired, csJunior), false)
  assert.equal(isEligible(expiredRecurring, csJunior), true)
})

test('scam rule: a fee-charging scholarship is always excluded', () => {
  const s = S({ requires_fee: true })
  assert.equal(isEligible(s, csJunior), false)
})

test('year level restriction respected', () => {
  assert.equal(isEligible(S({ year_levels: ['senior'] }), csJunior), false)
  assert.equal(isEligible(S({ year_levels: ['junior', 'senior'] }), csJunior), true)
})

test('state restriction respected', () => {
  assert.equal(isEligible(S({ states: ['CA'] }), csJunior), false)
  assert.equal(isEligible(S({ states: ['MI', 'WI'] }), csJunior), true)
})

test('ranking: affiliation + major beats a generic open award', () => {
  const targeted = S({ id: 1, name: 'SASE CS', affiliations: ['SASE'], majors: ['computer science'] })
  const generic = S({ id: 2, name: 'Open award' })
  const ranked = matchScholarships([generic, targeted], csJunior)
  assert.equal(ranked[0].scholarship.id, 1)
  assert.ok(ranked[0].score > ranked[1].score)
})

test('reasons are generated and human-readable', () => {
  const s = S({ id: 3, name: 'CS SASE', affiliations: ['SASE'], majors: ['computer science'], keywords: ['python'] })
  const [m] = matchScholarships([s], csJunior)
  assert.ok(m.reasons.some((r) => /major/i.test(r)))
  assert.ok(m.reasons.some((r) => /sase/i.test(r)))
  assert.ok(m.reasons.some((r) => /python/i.test(r)))
})

test('deadline urgency adds score and a reason', () => {
  const soon = new Date()
  soon.setDate(soon.getDate() + 10)
  const iso = soon.toISOString().slice(0, 10)
  const s = S({ id: 4, deadline: iso, recurring: false })
  const [m] = matchScholarships([s], csJunior)
  assert.ok(m.reasons.some((r) => /deadline/i.test(r)))
})
