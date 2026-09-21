import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from 'firebase/ai'
import { getFirebaseAIApp } from './firebaseAI.js'

const MIN_CONFIDENCE = 0.55
const MODEL = 'gemini-3.1-flash-lite'
const MAX_TEXT_CHARS = 30000

const factString = Schema.object({
  properties: {
    value: Schema.string(),
    evidence: Schema.string(),
    confidence: Schema.number(),
  },
})

const maybeString = Schema.object({
  properties: {
    value: Schema.string(),
    evidence: Schema.string(),
    confidence: Schema.number(),
  },
  optionalProperties: ['value', 'evidence'],
})

const maybeNumber = Schema.object({
  properties: {
    value: Schema.number(),
    evidence: Schema.string(),
    confidence: Schema.number(),
  },
  optionalProperties: ['value', 'evidence'],
})

const responseSchema = Schema.object({
  properties: {
    majors: Schema.array({ items: factString }),
    year_level: maybeString,
    gpa: maybeNumber,
    state: maybeString,
    school: maybeString,
    affiliations: Schema.array({ items: factString }),
    skills: Schema.array({ items: factString }),
    interests: Schema.array({ items: factString }),
    work_experience: Schema.array({ items: factString }),
  },
})

export async function analyzeResumeWithAI(text) {
  const resumeText = String(text || '').trim()
  if (!resumeText) throw new Error('Resume text is required.')
  if (resumeText.length > MAX_TEXT_CHARS) {
    throw new Error('Resume text is too long for AI extraction.')
  }

  const firebaseApp = getFirebaseAIApp()
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
  const model = getGenerativeModel(ai, {
    model: MODEL,
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: 3500,
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  const prompt = `
Extract a scholarship-search profile from the resume below.

Rules:
- Use only facts supported by the resume.
- Every non-null fact must include a short evidence quote from the resume.
- If a scalar fact is unsupported, omit value and evidence for that scalar.
- Normalize majors to common degree names.
- year_level must be freshman, sophomore, junior, senior, grad, or unsupported.
- You may derive year_level from an explicit expected graduation date relative to September 2026. If graduation is Apr/May 2027, use senior. Include the graduation text as evidence.
- Only return GPA when explicitly stated.
- state means the student's residency/home state for scholarship eligibility. Do not use a school location or employer location as residency.
- Affiliations must be explicitly stated organizations, programs, or statuses.
- Do not infer demographic or other sensitive personal attributes.
- Skills must be concrete and resume-supported.
- Interests may summarize clearly supported project or research areas.
- work_experience should contain concise role or experience labels.
- confidence measures support in the resume, not scholarship eligibility.
- Do not decide scholarship eligibility and do not create scholarship names.

RESUME:
<<<
${resumeText}
>>>
`.trim()

  try {
    const result = await withRetry(() => model.generateContent(prompt))
    const analysis = JSON.parse(result.response.text())
    return verifiedProfileFromAnalysis(resumeText, analysis, MODEL)
  } catch (error) {
    throw friendlyFirebaseAIError(error)
  }
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
  if (!profile.state) missing.push('residency state')
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

async function withRetry(operation) {
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === 2 || !isRetryable(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 1800))
    }
  }

  throw lastError
}

function isRetryable(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return (
    /fetch|network|timeout|unavailable|quota|resource.?exhausted/i.test(message) ||
    /fetch-error|request-error/i.test(code)
  )
}

function friendlyFirebaseAIError(error) {
  const code = String(error?.code || '')
  const message = error instanceof Error ? error.message : String(error || 'Firebase AI request failed')

  if (/app.?check|attestation|permission.?denied|403/i.test(message)) {
    return new Error('Firebase App Check blocked the AI request. Configure the production App Check site key and rebuild.')
  }

  if (/quota|resource.?exhausted|429/i.test(message)) {
    return new Error('Gemini free-tier quota is temporarily exhausted. Retry in a moment.')
  }

  if (/no-api-key|api-not-enabled/i.test(code) || /api.+not enabled/i.test(message)) {
    return new Error('Firebase AI Logic is not fully enabled for this Firebase project.')
  }

  return error instanceof Error ? error : new Error(message)
}
