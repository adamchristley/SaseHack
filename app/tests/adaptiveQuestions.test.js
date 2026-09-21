import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getAdaptiveQuestions } from '../src/lib/adaptiveQuestions.js'

function candidate(id, scholarship) {
  return {
    scholarship: { id, name: `Scholarship ${id}`, ...scholarship },
    eligibility: { status: 'needs_info', unknown: [] },
    score: 50,
    reasons: [],
  }
}

test('adaptive questions only ask facts that affect current candidates', () => {
  const needsInfo = [
    candidate(1, { min_gpa: 3.0, citizenship: 'US_OR_PR' }),
    candidate(2, { min_gpa: 3.5 }),
    candidate(3, { graduate_plan: 'phd' }),
  ]

  const questions = getAdaptiveQuestions(needsInfo, {
    gpa: null,
    citizenship: null,
    graduate_plan: null,
    age: null,
    state: null,
  })

  assert.deepEqual(
    questions.map((q) => q.key),
    ['gpa', 'citizenship', 'graduate_plan'],
  )
  assert.equal(questions[0].affected_count, 2)
})

test('adaptive questions disappear once the profile supplies the answer', () => {
  const needsInfo = [
    candidate(1, { min_gpa: 3.0, citizenship: 'US_OR_PR' }),
  ]

  const questions = getAdaptiveQuestions(needsInfo, {
    gpa: 3.8,
    citizenship: 'us_citizen',
  })

  assert.deepEqual(questions, [])
})

test('adaptive questions omit sensitive affiliation requirements', () => {
  const needsInfo = [
    candidate(1, { affiliations: ['women in engineering'] }),
  ]

  const questions = getAdaptiveQuestions(needsInfo, {
    affiliations: [],
  })

  assert.deepEqual(questions, [])
})

test('skipped questions stay out of the compact follow-up list', () => {
  const needsInfo = [
    candidate(1, { min_gpa: 3.0 }),
    candidate(2, { citizenship: 'US_OR_PR' }),
  ]

  const questions = getAdaptiveQuestions(
    needsInfo,
    { gpa: null, citizenship: null },
    3,
    ['gpa'],
  )

  assert.deepEqual(questions.map((q) => q.key), ['citizenship'])
})
