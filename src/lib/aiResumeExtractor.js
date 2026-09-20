const MIN_CONFIDENCE = 0.55

export async function analyzeResumeWithAI(text) {
  const response = await fetch('/api/resume-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'AI resume analysis failed.')
    error.code = payload.code || 'AI_ANALYSIS_FAILED'
    throw error
  }

  return verifiedProfileFromAnalysis(text, payload.analysis, payload.model)
}

export function verifiedProfileFromAnalysis(resumeText, analysis, model = 'unknown') {
  const rejected = []

  const takeList = (field) => {
    const items = Array.isArray(analysis?.[field]) ? analysis[field] : []
    const accepted = []

    for (const item of items) {
      if (
        typeof item?.value === 'string' &&
        item.value.trim() &&
        Number(item.confidence || 0) >= MIN_CONFIDENCE &&
        evidenceSupported(resumeText, item.evidence)
      ) {
        accepted.push(item.value.trim())
      } else if (item?.value) {
        rejected.push(`${field}:${item.value}`)
      }
    }

    return unique(accepted)
  }

  const takeScalar = (field) => {
    const item = analysis?.[field]
    if (item?.value == null || item?.value === '') return null

    if (
      Number(item.confidence || 0) >= MIN_CONFIDENCE &&
      evidenceSupported(resumeText, item.evidence)
    ) {
      return item.value
    }

    rejected.push(`${field}:${item?.value}`)
    return null
  }

  const yearLevel = normalizeYear(takeScalar('year_level'))
  const rawGpa = takeScalar('gpa')
  const gpa = rawGpa == null ? null : Number(rawGpa)
  const rawState = takeScalar('state')
  const state = typeof rawState === 'string' && /^[A-Za-z]{2}$/.test(rawState.trim())
    ? rawState.trim().toUpperCase()
    : null

  const profile = {
    majors: takeList('majors').map((x) => x.toLowerCase()),
    year_level: yearLevel,
    gpa: Number.isFinite(gpa) && gpa >= 0 && gpa <= 4 ? gpa : null,
    state,
    school: cleanString(takeScalar('school')),
    affiliations: takeList('affiliations'),
    skills: takeList('skills').map((x) => x.toLowerCase()),
    interests: takeList('interests').map((x) => x.toLowerCase()),
    work_experience: takeList('work_experience'),
  }

  const missing = []
  if (!profile.majors.length) missing.push('major')
  if (!profile.year_level) missing.push('year level')
  if (profile.gpa == null) missing.push('GPA')
  if (!profile.state) missing.push('state')
  if (!profile.school) missing.push('school')

  const fieldsFound = Object.entries(profile)
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value != null)
    .map(([key]) => key)

  return {
    profile,
    diagnostics: {
      source: 'gemini',
      model,
      fields_found: fieldsFound,
      missing_fields: missing,
      rejected_claims: rejected,
      evidence_verified: countValues(profile),
    },
  }
}

export function evidenceSupported(resumeText, evidence) {
  if (typeof evidence !== 'string' || evidence.trim().length < 2) return false

  const haystack = normalizeEvidence(resumeText)
  const needle = normalizeEvidence(evidence)
  if (!needle) return false
  if (haystack.includes(needle)) return true

  // PDF text extraction sometimes changes punctuation and line breaks.
  const tokens = needle.split(' ').filter((token) => token.length >= 2)
  return tokens.length >= 2 && tokens.every((token) => haystack.includes(token))
}

function normalizeEvidence(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeYear(value) {
  if (typeof value !== 'string') return null
  const year = value.trim().toLowerCase()
  return ['freshman', 'sophomore', 'junior', 'senior', 'grad'].includes(year)
    ? year
    : null
}

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function countValues(profile) {
  return Object.values(profile).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length
    return count + (value == null ? 0 : 1)
  }, 0)
}
