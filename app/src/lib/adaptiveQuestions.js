const QUESTION_DEFS = {
  gpa: { label: 'GPA', priority: 1 },
  citizenship: { label: 'Citizenship / residency', priority: 2 },
  graduate_plan: { label: 'Graduate study plans', priority: 3 },
  age: { label: 'Age', priority: 4 },
  state: { label: 'Residency state', priority: 5 },
}

/**
 * Pick only the missing profile facts that can change the current candidate set.
 * Sensitive/self-declared affiliations and scholarship-specific manual checks
 * intentionally stay out of the automatic questionnaire.
 */
export function getAdaptiveQuestions(needsInfo = [], profile = {}, limit = 3, skipped = []) {
  const skippedSet = new Set(skipped)
  const signals = new Map()

  needsInfo.forEach((match, index) => {
    const scholarship = match.scholarship || {}
    const relevanceWeight = Math.max(1, needsInfo.length - index)

    if (scholarship.min_gpa != null && profile.gpa == null) {
      addSignal(signals, 'gpa', match, relevanceWeight)
    }
    if (Array.isArray(scholarship.states) && scholarship.states.length && !profile.state) {
      addSignal(signals, 'state', match, relevanceWeight)
    }
    if (scholarship.citizenship && !profile.citizenship) {
      addSignal(signals, 'citizenship', match, relevanceWeight)
    }
    if ((scholarship.min_age != null || scholarship.max_age != null) && profile.age == null) {
      addSignal(signals, 'age', match, relevanceWeight)
    }
    if (scholarship.graduate_plan && !profile.graduate_plan) {
      addSignal(signals, 'graduate_plan', match, relevanceWeight)
    }
  })

  return [...signals.values()]
    .filter((item) => !skippedSet.has(item.key))
    .sort((a, b) =>
      b.affected_count - a.affected_count ||
      b.weight - a.weight ||
      QUESTION_DEFS[a.key].priority - QUESTION_DEFS[b.key].priority
    )
    .slice(0, limit)
    .map((item) => ({
      ...item,
      label: QUESTION_DEFS[item.key].label,
      scholarship_names: [...item.scholarship_names].slice(0, 3),
    }))
}

function addSignal(signals, key, match, relevanceWeight) {
  if (!signals.has(key)) {
    signals.set(key, {
      key,
      affected_count: 0,
      weight: 0,
      scholarship_names: new Set(),
    })
  }

  const item = signals.get(key)
  item.affected_count += 1
  item.weight += relevanceWeight
  if (match.scholarship?.name) item.scholarship_names.add(match.scholarship.name)
}
