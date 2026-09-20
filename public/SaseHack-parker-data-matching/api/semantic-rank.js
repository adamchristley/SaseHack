import { createGenAI, friendlyGeminiError, withGeminiRetry } from './genai-client.js'

const MODEL = 'gemini-embedding-2'
const OUTPUT_DIMENSIONS = 768
const MAX_DOCUMENTS = 80
const MAX_TEXT_CHARS = 2500

// Warm serverless instances reuse scholarship vectors across profile edits.
let documentCache = { key: null, vectors: null }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Semantic retrieval is not configured.',
      code: 'GEMINI_NOT_CONFIGURED',
    })
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : ''
  const documents = Array.isArray(req.body?.documents) ? req.body.documents : []

  if (!query || !documents.length) {
    return res.status(400).json({ error: 'query and documents are required.' })
  }
  if (documents.length > MAX_DOCUMENTS) {
    return res.status(400).json({ error: `At most ${MAX_DOCUMENTS} documents are supported.` })
  }

  const cleaned = documents.map((doc) => ({
    id: String(doc.id),
    text: String(doc.text || '').slice(0, MAX_TEXT_CHARS),
  }))

  const ai = createGenAI(process.env.GEMINI_API_KEY)

  try {
    const cacheKey = cleaned
      .map((doc) => `${doc.id}:${doc.text}`)
      .join('\u241f')
    const cacheHit = documentCache.key === cacheKey && Array.isArray(documentCache.vectors)

    let documentVectors = documentCache.vectors
    if (!cacheHit) {
      const documentResult = await withGeminiRetry(() => ai.models.embedContent({
        model: MODEL,
        contents: cleaned.map((doc) => ({ parts: [{ text: doc.text }] })),
        config: {
          taskType: 'SEMANTIC_SIMILARITY',
          outputDimensionality: OUTPUT_DIMENSIONS,
        },
      }))

      const documentEmbeddings = documentResult.embeddings || []
      if (documentEmbeddings.length !== cleaned.length) {
        return res.status(502).json({ error: 'Unexpected scholarship embedding response size.' })
      }

      documentVectors = documentEmbeddings.map((embedding) => embedding?.values || [])
      documentCache = { key: cacheKey, vectors: documentVectors }
    }

    const queryResult = await withGeminiRetry(() => ai.models.embedContent({
      model: MODEL,
      contents: [{ parts: [{ text: query.slice(0, MAX_TEXT_CHARS) }] }],
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: OUTPUT_DIMENSIONS,
      },
    }))

    const queryVector = queryResult.embeddings?.[0]?.values || []
    if (!queryVector.length) {
      return res.status(502).json({ error: 'Gemini did not return a query embedding.' })
    }

    const scores = cleaned.map((doc, index) => ({
      id: doc.id,
      score: cosine(queryVector, documentVectors[index] || []),
    })).sort((a, b) => b.score - a.score)

    return res.status(200).json({
      model: MODEL,
      dimensions: OUTPUT_DIMENSIONS,
      document_cache: cacheHit ? 'hit' : 'miss',
      scores,
    })
  } catch (error) {
    console.error('Semantic ranking endpoint error', error)
    return res.status(502).json({
      error: friendlyGeminiError(error),
      code: 'GEMINI_UPSTREAM_ERROR',
    })
  }
}

function cosine(a, b) {
  if (!a.length || a.length !== b.length) return 0
  let dot = 0
  let aa = 0
  let bb = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    aa += a[i] * a[i]
    bb += b[i] * b[i]
  }

  if (!aa || !bb) return 0
  return dot / (Math.sqrt(aa) * Math.sqrt(bb))
}
