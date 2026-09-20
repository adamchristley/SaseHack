import { assessEligibility, scoreMatch } from './matching.js'
import { RANKING_WEIGHTS } from '../data/rankingWeights.js'

const RRF_K = 60

export async function advancedScholarshipMatches(scholarships, profile, { limit = 20 } = {}) {
  const lexical = bm25Rank(scholarships, profile)
  let semantic = []
  let semanticAvailable = false
  let semanticModel = null
  let semanticError = null

  try {
    const result = await fetchSemanticRanking(scholarships, profile)
    semantic = result.scores
    semanticAvailable = true
    semanticModel = result.model
  } catch (error) {
    semanticError = error instanceof Error ? error.message : 'Semantic retrieval unavailable'
  }

  const today = new Date()
  const ruleRows = scholarships
    .map((scholarship) => ({
      scholarship,
      eligibility: assessEligibility(scholarship, profile, today),
    }))
    .filter((row) => row.eligibility.status !== 'ineligible')
    .map((row) => {
      const { score, reasons } = scoreMatch(row.scholarship, profile, today)
      return { ...row, ruleScore: score, reasons }
    })

  const lexicalRank = rankMap(lexical)
  const semanticRank = rankMap(semantic)
  const lexicalScores = scoreMap(lexical)
  const semanticScores = scoreMap(semantic)

  const fused = ruleRows.map((row) => {
    const id = String(row.scholarship.id)
    const lexRank = lexicalRank.get(id)
    const semRank = semanticRank.get(id)

    let rrf = 0
    if (lexRank != null) rrf += 1 / (RRF_K + lexRank)
    if (semanticAvailable && semRank != null) rrf += 1 / (RRF_K + semRank)

    return {
      ...row,
      lexicalScore: lexicalScores.get(id) || 0,
      semanticScore: semanticScores.get(id) || 0,
      rrf,
    }
  })

  const ruleNorm = normalizer(fused.map((x) => x.ruleScore))
  const lexicalNorm = normalizer(fused.map((x) => x.lexicalScore))
  const rrfNorm = normalizer(fused.map((x) => x.rrf))

  const ranked = fused.map((row) => {
    const ruleSignal = ruleNorm(row.ruleScore)
    const lexicalSignal = lexicalNorm(row.lexicalScore)
    const semanticSignal = semanticAvailable
      ? Math.max(0, Math.min(1, (row.semanticScore + 1) / 2))
      : 0

    const rrfSignal = semanticAvailable ? rrfNorm(row.rrf) : lexicalSignal
    const weights = semanticAvailable
      ? RANKING_WEIGHTS
      : { rules: 0.70, rrf: 0.30, semantic: 0 }

    const finalScore = 100 * (
      weights.rules * ruleSignal +
      weights.rrf * rrfSignal +
      weights.semantic * semanticSignal
    )

    const reasons = [...row.reasons]
    if (semanticAvailable && row.semanticScore >= 0.72) {
      reasons.push('Strong semantic match to your resume profile')
    }

    return {
      scholarship: row.scholarship,
      score: Math.round(finalScore * 10) / 10,
      reasons,
      eligibility: row.eligibility,
      retrieval: {
        rule_score: round(row.ruleScore, 2),
        lexical_score: round(row.lexicalScore, 3),
        semantic_similarity: semanticAvailable ? round(row.semanticScore, 3) : null,
        rrf_score: round(row.rrf, 5),
      },
    }
  })
    .sort((a, b) => b.score - a.score)

  const matches = ranked
    .filter((row) => row.eligibility.status === 'eligible')
    .slice(0, limit)

  const needsInfo = ranked
    .filter((row) => row.eligibility.status === 'needs_info')
    .slice(0, limit)

  return {
    matches,
    needs_info: needsInfo,
    meta: {
      mode: semanticAvailable ? 'hybrid' : 'hybrid-local',
      semantic_model: semanticModel,
      semantic_error: semanticError,
      lexical_method: 'BM25',
      fusion_method: 'Reciprocal Rank Fusion',
      weights: semanticAvailable
        ? RANKING_WEIGHTS
        : { rules: 0.70, rrf: 0.30, semantic: 0 },
    },
  }
}

export function bm25Rank(scholarships, profile) {
  const queryTokens = tokenize(buildProfileQuery(profile))
  if (!queryTokens.length) return []

  const docs = scholarships.map((scholarship) => ({
    id: String(scholarship.id),
    tokens: tokenize(scholarshipSearchText(scholarship)),
  }))

  const avgdl = docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / Math.max(1, docs.length)
  const documentFrequency = new Map()

  for (const term of new Set(queryTokens)) {
    let count = 0
    for (const doc of docs) {
      if (doc.tokens.includes(term)) count += 1
    }
    documentFrequency.set(term, count)
  }

  const k1 = 1.5
  const b = 0.75
  const N = docs.length

  return docs.map((doc) => {
    const frequencies = termFrequency(doc.tokens)
    let score = 0

    for (const term of queryTokens) {
      const tf = frequencies.get(term) || 0
      if (!tf) continue

      const df = documentFrequency.get(term) || 0
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      const denom = tf + k1 * (1 - b + b * (doc.tokens.length / Math.max(1, avgdl)))
      score += idf * ((tf * (k1 + 1)) / denom)
    }

    return { id: doc.id, score }
  }).sort((a, b) => b.score - a.score)
}

export function buildProfileQuery(profile = {}) {
  return [
    ...(profile.majors || []),
    profile.year_level,
    profile.school,
    profile.state,
    ...(profile.affiliations || []),
    ...(profile.skills || []),
    ...(profile.interests || []),
    ...(profile.work_experience || []),
  ].filter(Boolean).join(' ')
}

export function scholarshipSearchText(scholarship = {}) {
  return [
    scholarship.name,
    scholarship.sponsor,
    scholarship.description,
    ...(scholarship.majors || []),
    ...(scholarship.affiliations || []),
    ...(scholarship.keywords || []),
    ...(scholarship.year_levels || []),
    ...(scholarship.states || []),
  ].filter(Boolean).join(' ')
}

async function fetchSemanticRanking(scholarships, profile) {
  const query = buildProfileQuery(profile)
  if (!query.trim()) throw new Error('No profile query')

  const response = await fetch('/api/semantic-rank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      documents: scholarships.map((scholarship) => ({
        id: String(scholarship.id),
        text: scholarshipSearchText(scholarship),
      })),
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Semantic retrieval unavailable')
  return payload
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1)
}

function termFrequency(tokens) {
  const map = new Map()
  for (const token of tokens) map.set(token, (map.get(token) || 0) + 1)
  return map
}

function rankMap(rows) {
  const map = new Map()
  rows.forEach((row, index) => map.set(String(row.id), index + 1))
  return map
}

function scoreMap(rows) {
  return new Map(rows.map((row) => [String(row.id), Number(row.score) || 0]))
}

function normalizer(values) {
  if (!values.length) return () => 0
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return () => (max > 0 ? 1 : 0)
  return (value) => (value - min) / (max - min)
}

function round(value, places) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}
