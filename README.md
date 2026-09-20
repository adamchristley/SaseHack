# Charge Up Savings, student discounts & scholarships

SASEhack 2026 · Michigan Tech. A web app that finds the money a student is
already entitled to: **student discounts** at companies they already pay for,
and **scholarships** they're actually eligible for.

> Students lose money to *not knowing*, not to overspending.

This repo is **Parker's slice**: the data + the two engines (discount search,
scholarship matching) + a working UI for both. Built as a **pure client-side
React app**, no backend to run, all logic in the browser, so it's trivial to
demo and hard to break mid-pitch. (The plan's original FastAPI/Postgres stack
was swapped for JS since that's the team's language; the search and matching
logic map 1:1.)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 20 tests, node built-in runner, no deps
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
