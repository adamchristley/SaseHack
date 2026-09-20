/*
 * Discount search, fuzzy, typo-tolerant, alias-aware.
 *
 * The plan uses Postgres pg_trgm similarity. In a client-side app the direct
 * equivalent is Fuse.js: fuzzy scoring across a brand's name AND its aliases,
 * so "chipotel" finds Chipotle and "Creative Cloud" / "Adobe CC" both hit
 * Adobe. Same behaviour, no database.
 *
 * The page has exactly two states (plan): no query -> featured set; any query
 * -> closest matches only. This module powers both.
 */
import Fuse from 'fuse.js'

// Tuned to feel like trigram similarity with a ~0.25 threshold:
// generous typo tolerance, order-independent, matches anywhere in the string.
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.45,        // higher = fuzzier (Fuse: 0 exact, 1 anything)
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'brand', weight: 0.7 },
    { name: 'aliases', weight: 0.5 },
  ],
}

// Build the index once per dataset (cheap for our volume, but no need to
// rebuild on every keystroke).
let _cache = { data: null, fuse: null }
function getFuse(discounts) {
  if (_cache.data !== discounts) {
    _cache = { data: discounts, fuse: new Fuse(discounts, FUSE_OPTIONS) }
  }
  return _cache.fuse
}

const active = (d) => d.is_active !== false

/** Featured set for the default (no-query) view: hand-picked, popularity-ranked. */
export function featuredDiscounts(discounts, limit = 20) {
  return discounts
    .filter((d) => active(d) && d.is_featured)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit)
}

/** Category chips for browsing: [{category, count}]. */
export function categories(discounts) {
  const counts = new Map()
  for (const d of discounts) {
    if (!active(d)) continue
    counts.set(d.category, (counts.get(d.category) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Closest matches for a query. Empty/blank query returns [] (caller shows the
 * featured set instead). Results are ranked by fuzzy score, best first.
 */
export function searchDiscounts(discounts, query, { limit = 20 } = {}) {
  const q = (query || '').trim()
  if (!q) return []
  return getFuse(discounts.filter(active))
    .search(q, { limit })
    .map((r) => r.item)
}
