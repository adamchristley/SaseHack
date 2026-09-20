import { GoogleGenAI } from '@google/genai'
import scholarships from '../src/data/scholarships.js'
import { isEligible, scoreMatch } from '../src/lib/matching.js'
import {
  bm25Rank,
  buildProfileQuery,
  scholarshipSearchText,
} from '../src/lib/hybridRetrieval.js'

const MODEL = 'gemini-embedding-2'
const RRF_K = 60
const TOP_K = 5
const ITERATIONS = 14
const CANDIDATES_PER_ITERATION = 250

const benchmark = [
  {
    name: 'CS + SASE junior',
    profile: {
      majors: ['computer science'],
      year_level: 'junior',
      gpa: 3.6,
      state: 'MI',
      school: 'Michigan Technological University',
      affiliations: ['SASE'],
      skills: ['python', 'software engineering'],
      interests: ['machine learning', 'systems programming'],
      work_experience: ['software engineering intern'],
    },
    relevant: new Set([1, 3, 11, 12]),
  },
  {
    name: 'manufacturing-focused mechanical engineer',
    profile: {
      majors: ['mechanical engineering'],
      year_level: 'junior',
      gpa: 3.4,
      state: 'MI',
      school: 'Michigan Technological University',
      affiliations: [],
      skills: ['cad', 'manufacturing'],
      interests: ['manufacturing', 'automotive engineering'],
      work_experience: ['engineering intern'],
    },
    relevant: new Set([17, 18]),
  },
  {
    name: 'chemistry research sophomore',
    profile: {
      majors: ['chemistry'],
      year_level: 'sophomore',
      gpa: 3.8,
      state: 'MI',
      school: 'Michigan Technological University',
      affiliations: [],
      skills: ['research'],
      interests: ['chemistry', 'laboratory research'],
      work_experience: ['research assistant'],
    },
    relevant: new Set([10, 11]),
  },
  {
    name: 'graduating STEM researcher',
    profile: {
      majors: ['physics'],
      year_level: 'senior',
      gpa: 3.9,
      state: 'MI',
      school: 'Michigan Technological University',
      affiliations: [],
      skills: ['research', 'python'],
      interests: ['applied physics', 'research'],
      work_experience: ['undergraduate researcher'],
    },
    relevant: new Set([19, 20]),
  },
]

if (!process.env.GEMINI_API_KEY) {
  console.error('Set GEMINI_API_KEY before running npm run tune:ranking.')
  process.exit(1)
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const cases = []

for (const item of benchmark) {
  console.log(`Embedding benchmark case: ${item.name}`)
  cases.push({
    ...item,
    signals: await buildSignals(item.profile),
  })
}

const initial = [
  [0.55, 0.30, 0.15],
  [0.70, 0.20, 0.10],
  [0.45, 0.35, 0.20],
  [0.40, 0.25, 0.35],
  [0.60, 0.15, 0.25],
  [0.34, 0.33, 0.33],
]

const X = []
const y = []

for (const point of initial) {
  X.push(point)
  y.push(objective(point))
}

const rng = mulberry32(20260920)

for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
  const gp = fitGaussianProcess(X, y)
  const bestObserved = Math.max(...y)
  let bestCandidate = null
  let bestEI = -Infinity

  for (let i = 0; i < CANDIDATES_PER_ITERATION; i += 1) {
    const candidate = randomSimplex(rng)
    const { mean, variance } = gp.predict(candidate)
    const ei = expectedImprovement(mean, Math.sqrt(Math.max(variance, 1e-12)), bestObserved)

    if (ei > bestEI) {
      bestEI = ei
      bestCandidate = candidate
    }
  }

  const score = objective(bestCandidate)
  X.push(bestCandidate)
  y.push(score)

  console.log(
    `iteration ${String(iteration + 1).padStart(2, '0')}  nDCG@${TOP_K}=${score.toFixed(4)}  weights=${format(bestCandidate)}`,
  )
}

let bestIndex = 0
for (let i = 1; i < y.length; i += 1) {
  if (y[i] > y[bestIndex]) bestIndex = i
}

const best = X[bestIndex]
console.log('\nBest Bayesian-optimized ranking weights')
console.log(`nDCG@${TOP_K}: ${y[bestIndex].toFixed(4)}`)
console.log(`rules:    ${best[0].toFixed(4)}`)
console.log(`rrf:      ${best[1].toFixed(4)}`)
console.log(`semantic: ${best[2].toFixed(4)}`)
console.log('\nPaste these into src/data/rankingWeights.js after reviewing the benchmark.')

async function buildSignals(profile) {
  const eligible = scholarships.filter((s) => isEligible(s, profile))
  const lexical = bm25Rank(scholarships, profile)
  const semantic = await semanticRank(profile)

  const lexRanks = rankMap(lexical)
  const semRanks = rankMap(semantic)
  const semScores = scoreMap(semantic)

  const raw = eligible.map((scholarship) => {
    const { score } = scoreMatch(scholarship, profile)
    const id = String(scholarship.id)
    const lexRank = lexRanks.get(id)
    const semRank = semRanks.get(id)

    let rrf = 0
    if (lexRank != null) rrf += 1 / (RRF_K + lexRank)
    if (semRank != null) rrf += 1 / (RRF_K + semRank)

    return {
      id: scholarship.id,
      rules: score,
      rrf,
      semantic: (semScores.get(id) + 1) / 2,
    }
  })

  const ruleNorm = normalizer(raw.map((x) => x.rules))
  const rrfNorm = normalizer(raw.map((x) => x.rrf))

  return raw.map((row) => ({
    id: row.id,
    rules: ruleNorm(row.rules),
    rrf: rrfNorm(row.rrf),
    semantic: clamp(row.semantic, 0, 1),
  }))
}

async function semanticRank(profile) {
  const query = buildProfileQuery(profile)
  const docs = scholarships.map(scholarshipSearchText)
  const result = await ai.models.embedContent({
    model: MODEL,
    contents: [query, ...docs],
    config: {
      taskType: 'SEMANTIC_SIMILARITY',
      outputDimensionality: 128,
    },
  })

  const embeddings = result.embeddings || []
  const queryVector = embeddings[0]?.values || []

  return scholarships.map((scholarship, index) => ({
    id: String(scholarship.id),
    score: cosine(queryVector, embeddings[index + 1]?.values || []),
  })).sort((a, b) => b.score - a.score)
}

function objective(weights) {
  const [ruleW, rrfW, semanticW] = weights
  let total = 0

  for (const item of cases) {
    const ranked = [...item.signals]
      .map((row) => ({
        ...row,
        score: ruleW * row.rules + rrfW * row.rrf + semanticW * row.semantic,
      }))
      .sort((a, b) => b.score - a.score)

    total += ndcgAtK(ranked.map((row) => row.id), item.relevant, TOP_K)
  }

  return total / cases.length
}

function ndcgAtK(ids, relevant, k) {
  let dcg = 0
  for (let i = 0; i < Math.min(k, ids.length); i += 1) {
    const gain = relevant.has(ids[i]) ? 1 : 0
    dcg += gain / Math.log2(i + 2)
  }

  const idealHits = Math.min(k, relevant.size)
  let idcg = 0
  for (let i = 0; i < idealHits; i += 1) {
    idcg += 1 / Math.log2(i + 2)
  }

  return idcg ? dcg / idcg : 0
}

function fitGaussianProcess(X, y) {
  const n = X.length
  const K = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => rbf(X[i], X[j]) + (i === j ? 1e-6 : 0)),
  )
  const inverse = invertMatrix(K)
  const alpha = matVec(inverse, y)

  return {
    predict(x) {
      const k = X.map((point) => rbf(point, x))
      const mean = dot(k, alpha)
      const v = matVec(inverse, k)
      const variance = Math.max(1e-9, rbf(x, x) - dot(k, v))
      return { mean, variance }
    },
  }
}

function rbf(a, b, length = 0.28) {
  const dist2 = a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0)
  return Math.exp(-dist2 / (2 * length * length))
}

function expectedImprovement(mean, sigma, best) {
  if (sigma <= 1e-12) return 0
  const improvement = mean - best - 0.001
  const z = improvement / sigma
  return improvement * normalCdf(z) + sigma * normalPdf(z)
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

function erf(x) {
  const sign = x < 0 ? -1 : 1
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const ax = Math.abs(x)
  const t = 1 / (1 + p * ax)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sign * y
}

function invertMatrix(matrix) {
  const n = matrix.length
  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ])

  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    }

    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error('Singular GP kernel matrix')
    ;[a[col], a[pivot]] = [a[pivot], a[col]]

    const scale = a[col][col]
    for (let j = 0; j < 2 * n; j += 1) a[col][j] /= scale

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue
      const factor = a[row][col]
      for (let j = 0; j < 2 * n; j += 1) {
        a[row][j] -= factor * a[col][j]
      }
    }
  }

  return a.map((row) => row.slice(n))
}

function matVec(matrix, vector) {
  return matrix.map((row) => dot(row, vector))
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0)
}

function cosine(a, b) {
  if (!a.length || a.length !== b.length) return 0
  const ab = dot(a, b)
  const aa = dot(a, a)
  const bb = dot(b, b)
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0
}

function rankMap(rows) {
  return new Map(rows.map((row, index) => [String(row.id), index + 1]))
}

function scoreMap(rows) {
  return new Map(rows.map((row) => [String(row.id), Number(row.score) || 0]))
}

function normalizer(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return () => (max > 0 ? 1 : 0)
  return (value) => (value - min) / (max - min)
}

function randomSimplex(rng) {
  const raw = [-Math.log(Math.max(rng(), 1e-9)), -Math.log(Math.max(rng(), 1e-9)), -Math.log(Math.max(rng(), 1e-9))]
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map((x) => x / sum)
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function format(weights) {
  return `[${weights.map((x) => x.toFixed(3)).join(', ')}]`
}
