import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-3.1-flash-lite'
const MAX_TEXT_CHARS = 30000

const factString = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'string' },
    evidence: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const maybeString = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: ['string', 'null'] },
    evidence: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const maybeNumber = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: ['number', 'null'], minimum: 0, maximum: 4 },
    evidence: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['value', 'evidence', 'confidence'],
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    majors: { type: 'array', items: factString, maxItems: 5 },
    year_level: maybeString,
    gpa: maybeNumber,
    state: maybeString,
    school: maybeString,
    affiliations: { type: 'array', items: factString, maxItems: 12 },
    skills: { type: 'array', items: factString, maxItems: 30 },
    interests: { type: 'array', items: factString, maxItems: 20 },
    work_experience: { type: 'array', items: factString, maxItems: 12 },
  },
  required: [
    'majors', 'year_level', 'gpa', 'state', 'school',
    'affiliations', 'skills', 'interests', 'work_experience',
  ],
}

export default async function handler(req, res) {
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

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) return res.status(400).json({ error: 'Resume text is required.' })
  if (text.length > MAX_TEXT_CHARS) {
    return res.status(413).json({ error: 'Resume text is too long for the demo endpoint.' })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

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
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.05,
        maxOutputTokens: 3500,
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
      },
    })

    const analysis = JSON.parse(response.text)
    return res.status(200).json({ model: MODEL, analysis })
  } catch (error) {
    console.error('Resume analysis endpoint error', error)
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Gemini resume extraction failed.',
      code: 'GEMINI_UPSTREAM_ERROR',
    })
  }
}
