/*
 * Shared CareerOneStop client + normaliser.
 *
 * No secrets live here. The token is passed in by the caller (the serverless
 * handler reads it from the server environment). `normalize()` is a pure
 * function so it is unit-tested without any network. It is also the ONE place
 * tied to the API's field names, so if a request returns data the app doesn't
 * show, confirm the raw field names here (hit /api/scholarships?q=...&debug=1
 * to see a raw sample record).
 *
 * Safety: requires_fee is forced false and any fee-mentioning row is dropped,
 * so the scam rule holds for live data too. Unmapped eligibility fields stay
 * empty, which the matcher treats as "open to all" (no false exclusions), so
 * the curated rows with rich signals still rank on top.
 */
const BASE = 'https://api.careeronestop.org/v1/scholarshipfinder'

// Endpoint template: /{userId}/{keyword}/{sort}/{sortDir}/{start}/{limit}
export function buildUrl(userId, keyword, start, perPage) {
  const kw = encodeURIComponent(keyword && keyword.trim() ? keyword.trim() : 'scholarship')
  return `${BASE}/${encodeURIComponent(userId)}/${kw}/AwardAmount/DESC/${start}/${perPage}`
}

// The record array can sit under different keys depending on API version.
export function extractRecords(payload) {
  return payload?.Scholarships || payload?.ScholarshipList || payload?.Results || []
}

export function normalize(r) {
  const name = pick(r, ['ScholarshipName', 'Name', 'Title'])
  const url = pick(r, ['ApplyURL', 'Link', 'Url', 'ScholarshipLink'])
  if (!name || !url) return null

  const desc = String(pick(r, ['Purpose', 'PurposeStatement', 'Description']) || '')
  if (/application fee|entry fee|\bfee required\b/i.test(desc)) return null // scam guard

  const level = String(pick(r, ['LevelOfStudy', 'StudyLevel', 'AcademicLevel']) || '')

  return {
    name: String(name).trim(),
    sponsor: pick(r, ['OrganizationName', 'Organization', 'Sponsor']) || null,
    amount_min: money(pick(r, ['MinimumAward', 'AwardMin', 'MinAward'])),
    amount_max: money(pick(r, ['MaximumAward', 'AwardAmount', 'AwardMax', 'Amount'])),
    deadline: isoDate(pick(r, ['Deadline', 'ApplicationDeadline', 'DueDate'])),
    recurring: true,
    source_url: String(url).trim(),
    description: truncate(desc.trim(), 240),
    majors: [],
    min_gpa: null,
    year_levels: yearLevels(level),
    states: [],
    citizenship: null,
    affiliations: [],
    keywords: [],
    requires_fee: false,
    verified_at: new Date().toISOString().slice(0, 10),
  }
}

/**
 * Fetch + normalise one page of scholarships for a keyword.
 * @returns { scholarships: NormalizedRow[], sample_raw }
 * Throws an Error with `.status` on a non-OK response.
 */
export async function fetchScholarships({ q, limit = 50, userId, token, fetchImpl = fetch }) {
  const perPage = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const res = await fetchImpl(buildUrl(userId, q, 0, perPage), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = new Error(`CareerOneStop HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  const payload = await res.json()
  const raw = extractRecords(payload)
  const scholarships = []
  const seen = new Set()
  for (const rec of raw) {
    const s = normalize(rec)
    if (!s) continue
    const key = s.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    scholarships.push(s)
  }
  return { scholarships, sample_raw: raw[0] || null }
}

// ---- helpers -------------------------------------------------------------
function pick(obj, keys) {
  for (const k of keys) if (obj?.[k] != null && obj[k] !== '') return obj[k]
  return null
}
function money(v) {
  if (v == null) return null
  const n = Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
function isoDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}
function yearLevels(text) {
  const t = String(text).toLowerCase()
  const out = []
  if (/freshman|first[- ]year|high school/.test(t)) out.push('freshman')
  if (/sophomore/.test(t)) out.push('sophomore')
  if (/junior/.test(t)) out.push('junior')
  if (/senior/.test(t)) out.push('senior')
  if (/graduate|master|doctora|phd/.test(t)) out.push('grad')
  return [...new Set(out)] // empty = open to all year levels
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }
