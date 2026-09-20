// Runtime ranking weights. The Bayesian tuner in scripts/tune-ranking.mjs
// searches this simplex against the labeled relevance benchmark.
export const RANKING_WEIGHTS = Object.freeze({
  rules: 0.55,
  rrf: 0.30,
  semantic: 0.15,
})
