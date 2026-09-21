import { Type } from '@google/genai'
import { createGenAI, friendlyGeminiError, withGeminiRetry } from './genai-client.js'

const MODEL = 'gemini-3.1-flash-lite'
const MAX_TEXT_CHARS = 30000

const factString = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING },
    evidence: { type: Type.STRING },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const maybeString = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING, nullable: true },
    evidence: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const maybeNumber = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.NUMBER, nullable: true, minimum: 0, maximum: 4 },
    evidence: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    majors: { type: Type.ARRAY, items: factString },
    year_level: maybeString,
    gpa: maybeNumber,
    state: maybeString,
    school: maybeString,
    affiliations: { type: Type.ARRAY, items: factString },
    skills: { type: Type.ARRAY, items: factString },
    interests: { type: Type.ARRAY, items: factString },
    work_experience: { type: Type.ARRAY, items: factString },
  },
  required: [
    'majors', 'year_level', 'gpa', 'state', 'school',
    'affiliations', 'skills', 'interests', 'work_experience',
  ],
}

export default async function resumeAnalyze(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'AI extraction is not configured.',
      code: 'GEMINI_NOT_CONFIGURED',
    })
  }

  const body = parseBody(req.body)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return res.status(400).json({ error: 'Resume text is required.' })
  if (text.length > MAX_TEXT_CHARS) {
    return res.status(413).json({ error: 'Resume text is too long for the demo endpoint.' })
  }

  const ai = createGenAI(process.env.GEMINI_API_KEY)

  const prompt = `
Extract a scholarship-search profile from the resume below.

Rules:
- Use only facts supported by the resume.
- Every non-null fact must include a short evidence quote from the resume.
- If a scalar fact is unsupported, return null for value and evidence.
- Normalize majors to common degree names.
- year_level must be freshman, sophomore, junior, senior, grad, or null.
- You may derive year_level from an explicit expected graduation date relative to September 2026. If graduation is Apr/May 2027, use senior. Include the graduation text as evidence.
- Only return GPA when explicitly stated.
- state means the student's residency/home state for scholarship eligibility. Do not use a school location or employer location as residency. Return null unless residency/home location is explicit.
- Affiliations must be explicitly stated organizations, programs, or statuses.
- Do not infer demographic or other sensitive personal attributes.
- Skills must be concrete and resume-supported.
- Interests may summarize clearly supported project or research areas.
- work_experience should contain concise role or experience labels.
- confidence measures support in the resume, not scholarship eligibility.
- Do not decide scholarship eligibility and do not create scholarship names.

RESUME:
<<<
${text}
>>>
`.trim()

  try {
    const response = await withGeminiRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.05,
        maxOutputTokens: 3500,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }))

    const analysis = JSON.parse(response.text)
    return res.status(200).json({ model: MODEL, analysis })
  } catch (error) {
    console.error('Resume analysis endpoint error', error)
    return res.status(502).json({
      error: friendlyGeminiError(error),
      code: 'GEMINI_UPSTREAM_ERROR',
    })
  }
}

function parseBody(body) {
  if (body && typeof body === 'object') return body
  if (typeof body !== 'string' || !body.trim()) return {}

  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}
