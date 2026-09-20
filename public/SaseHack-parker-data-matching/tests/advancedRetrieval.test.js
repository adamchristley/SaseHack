import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evidenceSupported, verifiedProfileFromAnalysis } from '../src/lib/aiResumeExtractor.js'
import { bm25Rank } from '../src/lib/hybridRetrieval.js'

test('evidence verifier tolerates PDF whitespace and punctuation changes', () => {
  const resume = 'Michigan Technological University\nB.S. Computer Engineering\nGPA: 3.72'
  assert.equal(evidenceSupported(resume, 'B.S. Computer Engineering'), true)
  assert.equal(evidenceSupported(resume, 'GPA 3.72'), true)
  assert.equal(evidenceSupported(resume, 'Stanford University'), false)
})

test('unsupported AI claims are rejected before entering the profile', () => {
  const resume = 'B.S. Computer Engineering\nSkills: Python, React'
  const analysis = {
    majors: [{ value: 'computer engineering', evidence: 'B.S. Computer Engineering', confidence: 0.99 }],
    year_level: { value: null, evidence: null, confidence: 1 },
    gpa: { value: 3.9, evidence: 'GPA: 3.9', confidence: 0.9 },
    state: { value: null, evidence: null, confidence: 1 },
    school: { value: null, evidence: null, confidence: 1 },
    affiliations: [],
    skills: [
      { value: 'python', evidence: 'Skills: Python, React', confidence: 0.99 },
      { value: 'docker', evidence: 'Docker', confidence: 0.95 },
    ],
    interests: [],
    work_experience: [],
  }

  const result = verifiedProfileFromAnalysis(resume, analysis, 'test-model')
  assert.deepEqual(result.profile.majors, ['computer engineering'])
  assert.equal(result.profile.gpa, null)
  assert.ok(result.profile.skills.includes('python'))
  assert.ok(!result.profile.skills.includes('docker'))
  assert.equal(result.diagnostics.rejected_claims.length, 2)
})

test('BM25 puts a semantically literal scholarship above unrelated rows', () => {
  const scholarships = [
    {
      id: 1,
      name: 'Computing Award',
      description: 'Scholarship for computer engineering and software students',
      majors: ['computer engineering'],
      affiliations: [],
      keywords: ['python', 'software'],
      year_levels: [],
      states: [],
    },
    {
      id: 2,
      name: 'Chemistry Award',
      description: 'Scholarship for organic chemistry research',
      majors: ['chemistry'],
      affiliations: [],
      keywords: ['chemistry'],
      year_levels: [],
      states: [],
    },
  ]

  const ranked = bm25Rank(scholarships, {
    majors: ['computer engineering'],
    skills: ['python'],
    interests: ['software'],
  })

  assert.equal(ranked[0].id, '1')
  assert.ok(ranked[0].score > ranked[1].score)
})
