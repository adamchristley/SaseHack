/*
 * Tests for the national-database normaliser and merge. No network: fetch is
 * mocked, so these run offline and prove the mapping + safety rules.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalize, extractRecords, fetchScholarships } from '../api/_careeronestop.js'
import { mergeByName } from '../src/lib/mergeScholarships.js'

test('normalize maps core fields and coerces amounts', () => {
  const row = normalize({
    ScholarshipName: 'Example STEM Award',
    OrganizationName: 'Example Foundation',
    MaximumAward: '$5,000',
    Deadline: '2027-03-01',
    ApplyURL: 'https://example.org/apply',
    Purpose: 'For students in engineering.',
    LevelOfStudy: 'Undergraduate Junior',
  })
  assert.equal(row.name, 'Example STEM Award')
  assert.equal(row.sponsor, 'Example Foundation')
  assert.equal(row.amount_max, 5000)
  assert.equal(row.deadline, '2027-03-01')
  assert.equal(row.requires_fee, false)
  assert.ok(row.year_levels.includes('junior'))
})

test('normalize drops rows missing a name or url', () => {
  assert.equal(normalize({ ScholarshipName: 'No URL' }), null)
  assert.equal(normalize({ ApplyURL: 'https://x' }), null)
})

test('scam guard: a fee-mentioning row is dropped', () => {
  const row = normalize({
    ScholarshipName: 'Sketchy Award', ApplyURL: 'https://x',
    Purpose: 'Requires a small application fee to enter.',
  })
  assert.equal(row, null)
})

test('unmapped eligibility stays open (empty arrays, null gpa)', () => {
  const row = normalize({ ScholarshipName: 'Open Award', ApplyURL: 'https://x' })
  assert.deepEqual(row.majors, [])
  assert.equal(row.min_gpa, null)
})

test('extractRecords handles the known payload key variants', () => {
  assert.equal(extractRecords({ Scholarships: [1, 2] }).length, 2)
  assert.equal(extractRecords({ ScholarshipList: [1] }).length, 1)
  assert.equal(extractRecords({}).length, 0)
})

test('fetchScholarships normalises + dedupes a mocked response', async () => {
  const fakePayload = {
    Scholarships: [
      { ScholarshipName: 'A', ApplyURL: 'https://a', MaximumAward: '$1,000' },
      { ScholarshipName: 'A', ApplyURL: 'https://a2' }, // duplicate name -> dropped
      { ScholarshipName: 'B', ApplyURL: 'https://b' },
    ],
  }
  const fetchImpl = async () => ({ ok: true, json: async () => fakePayload })
  const { scholarships } = await fetchScholarships({ q: 'x', userId: 'u', token: 't', fetchImpl })
  assert.deepEqual(scholarships.map((s) => s.name), ['A', 'B'])
})

test('fetchScholarships throws with status on a non-OK response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) })
  await assert.rejects(
    fetchScholarships({ q: 'x', userId: 'u', token: 't', fetchImpl }),
    (e) => e.status === 401,
  )
})

test('mergeByName keeps curated on clash and assigns ids to new rows', () => {
  const curatedSet = [{ id: 1, name: 'SASE Scholarship Program', sponsor: 'real' }]
  const extra = [
    { name: 'SASE Scholarship Program', sponsor: 'dup' }, // dropped
    { name: 'National Award', sponsor: 'CareerOneStop' },
  ]
  const merged = mergeByName(curatedSet, extra)
  assert.equal(merged.length, 2)
  assert.equal(merged.find((s) => s.name === 'SASE Scholarship Program').sponsor, 'real')
  assert.ok(merged.find((s) => s.name === 'National Award').id > 1)
})
