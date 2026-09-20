/*
 * Scholarship matching engine, DETERMINISTIC. No LLM, ever.
 *
 * The plan's hard rule: "The LLM extracts. The database matches. Never the
 * other way round." Every match here comes from a real seed row with a real
 * source_url. This file only reads the profile and the seed data and scores.
 *
 * Convention that makes this trivial and safe: a NULL / empty eligibility
 * field means NO restriction. A scholarship with majors = [] is open to every
 * major. So a filter only ever excludes when the row *states* a requirement
 * the profile fails.
 *
 * Two passes:
 *   1. hardFilter, drop rows the student is ineligible for
 *   2. scoreMatch, rank what survives, and record WHY it matched
 */

// ---- small helpers -------------------------------------------------------

const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase())

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])

// case-insensitive intersection of two string lists
export function overlap(a, b) {
  const setB = new Set(list(b).map(norm))
  return list(a).filter((x) => setB.has(norm(x)))
}

function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  const ms = d.getTime() - new Date(today.toDateString()).getTime()
  return Math.round(ms / 86400000)
}

// ---- pass 1: hard filters ------------------------------------------------

/**
 * Returns true if the student is ELIGIBLE (row survives).
 * A missing profile field can't fail a requirement (we don't know), so we
 * only exclude when both the requirement AND the relevant profile fact exist.
 */
export function isEligible(scholarship, profile, today = new Date()) {
  const s = scholarship
  const p = profile || {}

  // Scam rule: legitimate awards never charge an application fee.
  if (s.requires_fee === true) return false

  // Major: excluded only if the row restricts majors and none overlap.
  if (list(s.majors).length && overlap(s.majors, p.majors).length === 0) return false

  // GPA: excluded if a minimum is set and the (known) GPA is below it.
  if (s.min_gpa != null && p.gpa != null && Number(p.gpa) < Number(s.min_gpa)) return false

  // Year level: excluded if restricted and the (known) year isn't included.
  if (list(s.year_levels).length && p.year_level &&
      !list(s.year_levels).map(norm).includes(norm(p.year_level))) return false

  // State: excluded if restricted and the (known) state isn't included.
  if (list(s.states).length && p.state &&
      !list(s.states).map(norm).includes(norm(p.state))) return false

  // Citizenship: excluded only on a stated mismatch.
  if (s.citizenship && p.citizenship && norm(s.citizenship) !== norm(p.citizenship)) return false

  // Deadline: a past, non-recurring deadline is dead.
  const d = daysUntil(s.deadline, today)
  if (d != null && d < 0 && !s.recurring) return false

  return true
}

// ---- pass 2: scoring + reasons ------------------------------------------

const WEIGHTS = {
  affiliation: 3.0,   // strongest signal, this is who the award is FOR
  major: 2.5,
  keyword: 1.5,       // each, capped
  urgency: 1.0,       // deadline within 60 days
  awardMax: 0.5,      // log-scaled by award size
}
const KEYWORD_CAP = 3 // count at most 3 keyword hits toward score

/**
 * Score one eligible scholarship and build human-readable reasons.
 * Reasons come ONLY from which filters/signals fired, never from a model.
 */
export function scoreMatch(scholarship, profile, today = new Date()) {
  const s = scholarship
  const p = profile || {}
  let score = 0
  const reasons = []

  // Affiliation, the highest-value signal.
  const affHits = overlap(s.affiliations, p.affiliations)
  if (affHits.length) {
    score += WEIGHTS.affiliation * Math.min(affHits.length, 2)
    reasons.push(`${affHits.map(titleCase).join(' & ')} members prioritised`)
  }

  // Major.
  const majorHits = overlap(s.majors, p.majors)
  if (majorHits.length) {
    score += WEIGHTS.major
    reasons.push(`Open to your major (${majorHits.map(titleCase).join(', ')})`)
  } else if (list(s.majors).length === 0) {
    reasons.push('Open to all majors')
  }

  // Keyword overlap with skills + interests.
  const profileSignals = [...list(p.skills), ...list(p.interests)]
  const kwHits = overlap(s.keywords, profileSignals)
  if (kwHits.length) {
    const counted = Math.min(kwHits.length, KEYWORD_CAP)
    score += WEIGHTS.keyword * counted
    reasons.push(`Matches what you do: ${kwHits.slice(0, 3).join(', ')}`)
  }

  // Year level, note eligibility as a reason even when unrestricted.
  if (list(s.year_levels).length && p.year_level) {
    reasons.push(`Open to ${norm(p.year_level)}s`)
  } else if (list(s.year_levels).length === 0) {
    reasons.push('Open to all year levels')
  }

  // Deadline urgency.
  const d = daysUntil(s.deadline, today)
  if (d != null && d >= 0 && d <= 60) {
    score += WEIGHTS.urgency
    reasons.push(d === 0 ? 'Deadline is today' : `Deadline in ${d} day${d === 1 ? '' : 's'}`)
  }

  // Award size, mild log-scaled nudge so bigger awards float up on ties.
  const amount = Number(s.amount_max || s.amount_min || 0)
  if (amount > 0) {
    const scaled = Math.min(Math.log10(amount + 1) / Math.log10(50001), 1)
    score += WEIGHTS.awardMax * scaled
  }

  return { score: round2(score), reasons }
}

// ---- public entry point --------------------------------------------------

/**
 * Rank scholarships for a profile.
 * @returns [{ scholarship, score, reasons }] sorted best-first.
 */
export function matchScholarships(scholarships, profile, { limit = 20, today = new Date() } = {}) {
  return list(scholarships)
    .filter((s) => isEligible(s, profile, today))
    .map((s) => {
      const { score, reasons } = scoreMatch(s, profile, today)
      return { scholarship: s, score, reasons }
    })
    .sort((a, b) => b.score - a.score || deadlineTie(a, b))
    .slice(0, limit)
}

// nearer deadline wins a score tie
function deadlineTie(a, b) {
  const da = daysUntil(a.scholarship.deadline)
  const db = daysUntil(b.scholarship.deadline)
  if (da == null) return 1
  if (db == null) return -1
  return da - db
}

function round2(n) { return Math.round(n * 100) / 100 }
function titleCase(s) { return String(s).replace(/\b\w/g, (c) => c.toUpperCase()) }
