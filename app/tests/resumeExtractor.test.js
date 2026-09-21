import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeResumeText } from '../src/lib/resumeExtractor.js'

test('resume analyzer extracts scholarship profile fields without inventing missing facts', () => {
  const resume = `
    Jordan Student
    Houghton, MI

    EDUCATION
    Michigan Technological University
    B.S. Computer Engineering
    GPA: 3.72

    EXPERIENCE
    Software Engineering Intern
    Built Python and React tools using Docker and PostgreSQL.

    ACTIVITIES
    Society of Asian Scientists and Engineers (SASE)
    IEEE
  `

  const { profile, diagnostics } = analyzeResumeText(resume)

  assert.deepEqual(profile.majors, ['computer engineering'])
  assert.equal(profile.gpa, 3.72)
  assert.equal(profile.state, 'MI')
  assert.match(profile.school, /Michigan Technological University/i)
  assert.ok(profile.affiliations.includes('SASE'))
  assert.ok(profile.affiliations.includes('IEEE'))
  assert.ok(profile.skills.includes('python'))
  assert.ok(profile.skills.includes('react'))
  assert.equal(profile.year_level, null)
  assert.ok(diagnostics.missing_fields.includes('year level'))
})

test('resume analyzer finds explicit year level and interest terms', () => {
  const resume = `
    Senior computer science student focused on machine learning and cybersecurity.
    Skills: Python, PyTorch, SQL
  `

  const { profile } = analyzeResumeText(resume)
  assert.equal(profile.year_level, 'senior')
  assert.deepEqual(profile.majors, ['computer science'])
  assert.ok(profile.interests.includes('machine learning'))
  assert.ok(profile.interests.includes('cybersecurity'))
})
