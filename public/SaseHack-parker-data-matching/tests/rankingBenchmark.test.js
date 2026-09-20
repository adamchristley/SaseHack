import { test } from 'node:test'
import assert from 'node:assert/strict'
import scholarships from '../src/data/scholarships.js'
import rankingBenchmark from '../src/data/rankingBenchmark.js'
import { assessEligibility } from '../src/lib/matching.js'

const byId = new Map(scholarships.map((scholarship) => [scholarship.id, scholarship]))

test('ranking benchmark only labels existing scholarships', () => {
  for (const item of rankingBenchmark) {
    for (const id of Object.keys(item.relevance).map(Number)) {
      assert.ok(byId.has(id), `${item.name} references missing scholarship ${id}`)
    }
  }
})

test('graded benchmark labels are 1 to 3', () => {
  for (const item of rankingBenchmark) {
    for (const [id, grade] of Object.entries(item.relevance)) {
      assert.ok(
        Number.isInteger(grade) && grade >= 1 && grade <= 3,
        `${item.name} has invalid relevance grade ${grade} for scholarship ${id}`,
      )
    }
  }
})

test('labeled benchmark scholarships satisfy encoded eligibility', () => {
  for (const item of rankingBenchmark) {
    for (const id of Object.keys(item.relevance).map(Number)) {
      const scholarship = byId.get(id)
      const eligibility = assessEligibility(scholarship, item.profile)
      assert.equal(
        eligibility.status,
        'eligible',
        `${item.name}: scholarship ${id} is ${eligibility.status} (${eligibility.unknown.join(', ')})`,
      )
    }
  }
})
