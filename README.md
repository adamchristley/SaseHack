# Charge Up Savings — student discounts & scholarships

**SASEhack 2026 · Michigan Technological University.** A web app that finds the money a student is already entitled to: discounts at companies they already pay for, and scholarships they are actually eligible for.

> Students lose money to not knowing, not to overspending.

Upload a resume. The app reads it, works out what you qualify for, and shows you a dollar figure with a source link behind every line of it. No application fees, no aggregators, no invented data.

---

## Run it

```bash
npm install
npm run dev       # frontend — http://localhost:5173
npm run dev:full  # Vite + local Node API server (needed for Gemini endpoints)
npm test          # node built-in test runner
npm run build     # production build to dist/
```

The static front end (`public/`) needs no build step — open `public/index.html` directly, or serve it:

```bash
npx serve public
```

---

