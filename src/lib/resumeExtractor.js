// Resume text extraction and deterministic profile analysis.
//
// This module only extracts facts explicitly supported by the resume. It does
// not decide scholarship eligibility. Parker's matcher remains the source of
// truth for eligibility and ranking.

const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs'
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

const MAJORS = [
  'computer engineering',
  'computer science',
  'electrical engineering',
  'mechanical engineering',
  'civil engineering',
  'chemical engineering',
  'biomedical engineering',
  'software engineering',
  'data science',
  'cybersecurity',
  'information technology',
  'business',
  'finance',
  'accounting',
  'economics',
  'mathematics',
  'statistics',
  'biology',
  'chemistry',
  'physics',
  'nursing',
  'psychology',
]

const SKILLS = [
  'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'c',
  'go', 'rust', 'swift', 'kotlin', 'dart', 'matlab', 'r',
  'react', 'next.js', 'node.js', 'express', 'fastapi', 'flask', 'django',
  'html', 'css', 'sql', 'postgres', 'postgresql', 'mysql', 'mongodb',
  'firebase', 'supabase', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
  'linux', 'aws', 'azure', 'gcp', 'tensorflow', 'pytorch', 'scikit-learn',
  'pandas', 'numpy', 'opencv', 'langchain', 'rest api', 'graphql',
  'opensearch', 'milvus', 'openshift', 'terraform', 'transformers',
  'cnns', 'vits', 'snns', 'rag', 'embeddings', 'vector search',
  'k-nn', 'cross-encoder reranking', 'jupyter notebooks',
  'embedded systems', 'arm assembly', 'stm32', 'verilog', 'vhdl',
]

const INTEREST_TERMS = [
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'data science',
  'cybersecurity',
  'networking',
  'robotics',
  'embedded systems',
  'quantitative finance',
  'finance',
  'biomedical',
  'healthcare',
  'cloud computing',
  'web development',
  'mobile development',
  'game development',
  'computer vision',
  'natural language processing',
  'retrieval augmented generation',
  'rag',
  'semantic search',
  'vector search',
  'neural decoding',
  'signal processing',
  'medical imaging',
  'autonomous robotics',
]

const AFFILIATIONS = [
  ['society of asian scientists and engineers', 'SASE'],
  ['sase', 'SASE'],
  ['society of women engineers', 'SWE'],
  ['national society of black engineers', 'NSBE'],
  ['society of hispanic professional engineers', 'SHPE'],
  ['institute of electrical and electronics engineers', 'IEEE'],
  ['ieee', 'IEEE'],
  ['association for computing machinery', 'ACM'],
  ['first-generation', 'first-generation'],
  ['first generation', 'first-generation'],
  ['veteran', 'veteran'],
  ['rotc', 'ROTC'],
]

const STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const YEAR_LEVELS = ['freshman', 'sophomore', 'junior', 'senior', 'grad']

const unique = (values) => [...new Set(values.filter(Boolean))]
const normalize = (text) => String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim()
const lower = (text) => normalize(text).toLowerCase()

export async function extractResumeText(file) {
  if (!file) throw new Error('Choose a resume first.')

  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file)
  }

  if (
    file.type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    return normalize(await file.text())
  }

  throw new Error('For the MVP, upload a PDF, TXT, or Markdown resume.')
}

async function extractPdfText(file) {
  let pdfjs
  try {
    pdfjs = await import(/* @vite-ignore */ PDFJS_URL)
  } catch {
    throw new Error('Could not load the PDF reader. Check your internet connection and try again.')
  }

  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    let pageText = ''

    for (const item of content.items) {
      if (!('str' in item)) continue
      pageText += item.str
      pageText += item.hasEOL ? '\n' : ' '
    }

    pages.push(pageText)
  }

  const text = normalize(pages.join('\n'))
  if (!text) throw new Error('No readable text was found in that PDF.')
  return text
}

export function analyzeResumeText(rawText) {
  const text = normalize(rawText)
  const textLower = text.toLowerCase()
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

  const profile = {
    majors: findPhrases(textLower, MAJORS),
    year_level: findYearLevel(textLower) || inferYearLevelFromGraduation(text),
    gpa: findGpa(text),
    state: findState(lines),
    school: findSchool(lines),
    affiliations: findAffiliations(textLower),
    skills: findPhrases(textLower, SKILLS),
    interests: findPhrases(textLower, INTEREST_TERMS),
    work_experience: findWorkExperience(lines),
  }

  const missing = []
  if (!profile.majors.length) missing.push('major')
  if (!profile.year_level) missing.push('year level')
  if (profile.gpa == null) missing.push('GPA')
  if (!profile.state) missing.push('state')
  if (!profile.school) missing.push('school')

  return {
    profile,
    diagnostics: {
      characters_read: text.length,
      fields_found: Object.entries(profile)
        .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value != null)
        .map(([key]) => key),
      missing_fields: missing,
      derived_fields: findYearLevel(textLower) ? [] : (profile.year_level ? ['year level from expected graduation'] : []),
    },
  }
}

function findPhrases(textLower, dictionary) {
  return unique(dictionary.filter((term) => containsTerm(textLower, term)))
}

function containsTerm(textLower, term) {
  const escaped = term.toLowerCase().replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(textLower)
}

function findGpa(text) {
  const patterns = [
    /\bGPA\s*[:=-]?\s*([0-4](?:\.\d{1,2})?)\b/i,
    /\b([0-4](?:\.\d{1,2})?)\s*\/\s*4\.0\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const value = Number(match[1])
    if (value >= 0 && value <= 4) return value
  }
  return null
}

function findYearLevel(textLower) {
  for (const year of YEAR_LEVELS) {
    if (containsTerm(textLower, year)) return year
  }
  if (containsTerm(textLower, 'graduate student')) return 'grad'
  return null
}

function findState(lines) {
  // Residency state is an eligibility field. Only inspect the contact header,
  // never school or employer locations later in the resume.
  const header = lines.slice(0, 3).join(' ')
  const codes = STATE_CODES.join('|')
  const match = header.match(new RegExp(`(?:,|\\s)\\s*(${codes})(?=\\s|\\d|$)`, 'i'))
  return match ? match[1].toUpperCase() : null
}

function findSchool(lines) {
  const schoolLine = lines.find((line) =>
    /\b(university|college|institute of technology|polytechnic)\b/i.test(line) &&
    !/\bhigh school\b/i.test(line)
  )
  if (!schoolLine) return null

  const institution = schoolLine.match(
    /^(.+?\b(?:University|College|Institute of Technology|Polytechnic)\b)/i,
  )

  return (institution?.[1] || schoolLine)
    .replace(/\b(expected|graduation|gpa)\b.*$/i, '')
    .trim()
    .slice(0, 120) || null
}

function findAffiliations(textLower) {
  const hits = []
  for (const [term, label] of AFFILIATIONS) {
    if (containsTerm(textLower, term)) hits.push(label)
  }
  return unique(hits)
}

function findWorkExperience(lines) {
  return unique(
    lines.filter((line) =>
      /\b(intern|engineer|developer|researcher|research assistant|analyst|technician|consultant|assistant)\b/i.test(line)
    )
  ).slice(0, 8)
}


function inferYearLevelFromGraduation(text, today = new Date()) {
  const match = text.match(
    /(?:expected\s+graduation|graduation|expected)\s*[,\-:]?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*(20\d{2})/i,
  )
  if (!match) return null

  const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const month = match[1] ? monthNames.findIndex((m) => match[1].toLowerCase().startsWith(m)) : 4
  const graduation = new Date(Number(match[2]), month >= 0 ? month : 4, 1)
  const months = (graduation.getFullYear() - today.getFullYear()) * 12 +
    (graduation.getMonth() - today.getMonth())

  if (months < -3) return 'grad'
  if (months <= 12) return 'senior'
  if (months <= 24) return 'junior'
  if (months <= 36) return 'sophomore'
  if (months <= 54) return 'freshman'
  return null
}
