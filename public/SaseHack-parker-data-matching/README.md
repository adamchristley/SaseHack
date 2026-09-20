# Charge Up Savings, student discounts & scholarships

SASEhack 2026 · Michigan Tech. A web app that finds the money a student is
already entitled to: **student discounts** at companies they already pay for,
and **scholarships** they're actually eligible for.

> Students lose money to *not knowing*, not to overspending.

This repo contains the scholarship/discount data, matching logic, resume
understanding pipeline, and working React UI. Most ranking logic stays local and
deterministic; Gemini-backed extraction and semantic retrieval run through small
server-side API endpoints so the API key never ships to the browser.

## Run it

```bash
npm install
npm run dev      # frontend only; local extraction + deterministic retrieval work
npm run dev:full # Vite + local Node API server for Gemini endpoints
npm test         # node built-in test runner
npm run build    # production build to dist/
```

## What's here

| Area | File | Notes |
|------|------|-------|
| Discount search | `src/lib/search.js` | Fuzzy, typo-tolerant, alias-aware (Fuse.js ≈ pg_trgm). "chipotel" → Chipotle. |
| Scholarship matcher | `src/lib/matching.js` | **Deterministic.** Hard filters, then scoring, with a reason for every match. No LLM. |
| Seed data | `src/data/discounts.js`, `src/data/scholarships.js` | Real programs, real source URLs. See caveat below. |
| UI | `src/pages/`, `src/components/` | Home / Discounts / Scholarships + a Login stub for the auth teammate. |
| Palette | `src/styles/tokens.css` | MTU black & gold as CSS variables, one edit to retheme. |
| Tests | `tests/matching.test.js`, `tests/search.test.js` | The cases the plan asked for. |

## The two things that make this more than a directory

1. **Freshness is the feature.** Every discount carries a `verified_at` date and
   a source link. The card shows how long ago we last checked.
2. **Explainable matching.** Every scholarship match lists *why* it matched
   (`"SASE members prioritised"`, `"Open to your major"`, `"Deadline in 42 days"`)
, generated from which filters/signals fired, never from a model.

## ⚠️ Data is a STARTER set, verify before the pitch

Per the plan's hard rule, **nothing here is invented**, every row is a real
program with a real `source_url` you can open. But this is ~28 discounts and 50
scholarships (plan targets are 120+ / 50+), and the `verified_at`, `deadline`,
and dollar amounts are **placeholders**. Building/running the verifier (walk
every `source_url`, confirm the offer still exists, stamp the real date) and
expanding the dataset is the deliverable. Adding a row = one hand-filled object.

**Never** let a model generate data rows, and **never** scrape UNiDAYS / Student
Beans / aggregators.

## Safety rules baked in

- Scholarships with an application fee (`requires_fee`) are excluded outright, scam protection.
- Every scholarship links to its official source.
- The profile is never persisted, it lives in React state for the session only.

## Integration notes for teammates

- **Data shape = the frozen contract.** Discount rows match
  `GET /api/discounts/search`; scholarship matches match
  `POST /api/scholarships/match`. When the backend exists, swap the
  `import ... from '../data/*.js'` for `fetch()` calls, the components don't change.
- **Extractor teammate:** the `ProfilePanel` field names are the `StudentProfile`
  contract. `POST /api/resume` should return exactly that shape; it drops
  straight into the matcher.
- **Auth teammate:** the Login tab is a stub. Nothing is gated behind it.
- **Missing-company requests** currently write to `localStorage`; swap for
  `POST /api/requests` when it's ready.

## Accessibility

Keyboard navigable, visible focus states, real labels on the search input and
all profile fields, MTU-gold-on-dark contrast. (Education/Accessibility is a
scored track, the plan says judges check.)


## Adam's resume + advanced retrieval pipeline

The scholarship flow is deliberately split into understanding, retrieval, eligibility, and ranking:

```
resume PDF
   |
PDF.js text extraction
   |
Gemini 3.1 Flash-Lite structured extraction
   |
evidence verifier (rejects unsupported model claims)
   |
StudentProfile
   |
   +--> BM25 lexical retrieval ------------------+
   |                                             |
   +--> Gemini Embedding 2 semantic retrieval ---+--> Reciprocal Rank Fusion
                                                     |
                                             deterministic eligibility
                                                     |
                                             weighted reranking
                                                     |
                                            explainable top matches
```

The model never creates scholarships and never makes the final eligibility decision. Every AI-extracted fact must carry resume evidence, and the client verifies that evidence against the original extracted text before adding it to the profile.

If Gemini is unavailable, the app automatically falls back to the local deterministic resume parser plus BM25 and rule-based scholarship ranking.

### Free Gemini setup

1. Create a Gemini API key in Google AI Studio.
2. Copy `.env.example` to `.env.local`.
3. Set `GEMINI_API_KEY`.
4. Run `npm install`.
5. Run `npm run dev:full` so Vercel serves both Vite and the `/api` functions.

The API key is only read by serverless functions. Do not put it in `VITE_*` variables or client-side code.

### Hybrid retrieval

- **BM25** finds exact profile/scholarship term overlap.
- **Gemini Embedding 2** finds conceptual similarity.
- **Reciprocal Rank Fusion (RRF)** combines the independent rankings without assuming their raw scores are calibrated.
- **Deterministic eligibility** applies GPA, major, year, age, citizenship, graduate-study intent, location, deadline, and scholarship-specific requirements.
- Scholarship embeddings are cached on warm API instances so profile edits normally require only a new query embedding.
- Cards expose rule score, BM25 score, semantic similarity, and RRF contribution for a judge-friendly technical demo.

### Adaptive follow-up questions

The resume is never treated like a complete scholarship application. After
retrieval, the UI inspects only the current candidate scholarships and asks up
to three optional questions that could actually change eligibility, such as GPA,
citizenship, or graduate-study plans. Users can skip any question.

Sensitive eligibility groups are never inferred and are not automatically
prompted. They can only be self-declared in the full profile editor.

### Bayesian ranking optimization

`npm run tune:ranking` runs an offline Gaussian-process Bayesian optimizer over the three runtime weights:

```
rules + RRF + semantic similarity
```

The objective is mean graded nDCG@5 on the validation cases in
`src/data/rankingBenchmark.js`. The current benchmark contains 10 synthetic
student profiles with 0-3 relevance judgments and is intentionally a hackathon
validation set, not evidence of production-quality generalization. Review the
labels as a team before quoting benchmark results in the pitch.

The tuner requires `GEMINI_API_KEY` because it computes semantic embeddings, then prints the best weight triple to copy into `src/data/rankingWeights.js`.
