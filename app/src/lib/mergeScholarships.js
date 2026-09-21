/*
 * Merge the curated set with live national results, deduped by name.
 * Curated rows win a name clash: they are hand-verified and carry the local
 * touches (SASE, Michigan Tech) and rich eligibility fields the matcher uses.
 */
export function mergeByName(curated, extra) {
  const seen = new Set(curated.map((s) => norm(s.name)))
  let nextId = curated.reduce((m, s) => Math.max(m, s.id || 0), 0)
  const added = []
  for (const s of extra || []) {
    const key = norm(s?.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    added.push({ ...s, id: s.id ?? ++nextId })
  }
  return [...curated, ...added]
}

const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase())
