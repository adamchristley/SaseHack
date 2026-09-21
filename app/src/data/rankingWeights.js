// Runtime ranking weights.
// Bayesian-optimized on the 10-profile graded validation benchmark using nDCG@5.
// Baseline: 0.9248 with [0.55, 0.30, 0.15]
// Tuned:    0.9579 with [0.0136, 0.0897, 0.8967]
//
// Eligibility is still enforced deterministically before ranking. These weights
// only control the ordering of candidates that survive the eligibility engine.
export const RANKING_WEIGHTS = Object.freeze({
  rules: 0.0136,
  rrf: 0.0897,
  semantic: 0.8967,
})
