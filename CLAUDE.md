# Project
Student savings web app (SASEhack 2026, Michigan Tech). Two features:
discount finder (fuzzy search brands for student discounts) and scholarship
matcher (StudentProfile → deterministic ranked eligible scholarships with
reasons). This repo is Parker's slice: data + both engines + UI.

# Stack
Client-side React + Vite (plain JS, plain CSS). Curated data is bundled under
`src/data/`; all matching/search logic runs in the browser. One serverless
proxy (`api/scholarships.js`) fronts the live CareerOneStop national scholarship
database, mounted into Vite in dev. Fuse.js for fuzzy search. Node built-in test
runner (`npm test`).

# Hard rules
- Scholarship matching is DETERMINISTIC (filters + scoring in `matching.js`).
  Never let a model generate scholarship names, URLs, or any data rows.
- Every discount and scholarship row must have a real, openable `source_url`.
- A NULL / empty eligibility field on a scholarship means NO restriction.
- Scholarships with `requires_fee: true` are always excluded (scam rule).
- No accounts/auth here (auth is a teammate's tab); profiles are React-state
  only, never persisted.
- API secrets (CareerOneStop token) live server-side only, in env vars, never
  in client code and never committed. Live results fall back to the curated set
  on any error, so the demo can't die on a bad network.

# Conventions
- Data shapes are the frozen API contract, don't rename fields.
  Discount row ≈ GET /api/discounts/search; ProfilePanel fields = StudentProfile.
- Tests required for `matching.js` and `search.js`. Others optional.
- MTU palette lives in `src/styles/tokens.css` as CSS variables, retheme once.
- Keep it accessible: labels, visible focus, contrast (scored track).
