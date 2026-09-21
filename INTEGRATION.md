# One site

Everything we built on separate branches now ships as a single deployable site.

- **Marketing front door + auth** (`public/`) from `main`: landing page, Firebase
  login and register, and the styled pages. The "Start" / "Find my number" /
  dashboard buttons open the real tool at `/tool/`.
- **The working tool** (`app/`) from `adam-resume-extractor`: the React app with
  the discount finder and the scholarship matcher, including Gemini resume
  understanding, adaptive questions, and hybrid (deterministic + semantic)
  ranking.
- **Our data + live national database** (from `parker-data-matching`): the
  60-discount dataset and the CareerOneStop proxy
  (`app/api/scholarships.js`, `app/api/_careeronestop.js`), merged into the
  matcher's candidate pool.
- **Firebase account features** (from `main`): the tool reads the same login as
  the marketing site, and a signed-in user can save their profile and opt into
  the weekly digest from the account tab.
- **Scholarship email digest** (`digest/`): unchanged GitHub Actions workflow.

## Layout

```
public/            marketing site + Firebase auth (deployed root)
public/tool/       BUILT React app (generated from app/, served at /tool/)
app/               React app SOURCE (build target: ../public/tool, base: /tool/)
digest/            scholarship email digest (GitHub Actions)
.github/ .vscode/
```

## Run it

```bash
# the tool, in dev (frontend only; local extraction + deterministic ranking work)
cd app && npm install && npm run dev

# the tool with the Gemini + national-DB API server (needs keys, see app/.env.example)
cd app && npm run dev:full

# rebuild the tool into the site after any change
cd app && npm run build      # writes ../public/tool

# preview the whole integrated site (marketing + /tool/)
cd public && python -m http.server 8099   # open http://localhost:8099
```

`public/tool/` is committed build output. Rebuild and commit it whenever `app/`
changes, otherwise the deployed site keeps serving the old bundle.

## How the pieces connect

- **Navigation.** The marketing pages link to `/tool/`. Inside the tool the
  section tabs write the URL hash (`/tool/#discounts`), so the marketing site can
  deep-link to a section, and the brand mark returns to `/`.
- **Auth.** `app/src/firebase-config.js` points at the same Firebase project as
  `public/firebase-config.js`. "Log in" goes to `/login.html`; when that session
  exists the tool swaps the Log in tab for the account tab.
- **Stored data.** Nothing personal is saved unless a signed-in user turns on
  "Save my profile" (`storageAllowed` in Firestore). The digest reads
  `emailOptIn` from the same user document.
- **Scholarship pool.** The matcher ranks the curated set merged with live
  CareerOneStop results for the profile's main keyword. Curated rows win a name
  clash. If the API is unavailable the page says so and shows the curated set.

## Deploy note

`public/` is the deployable folder. The Gemini and CareerOneStop endpoints under
`/api` need a server (the local Node API in dev, or serverless functions in
prod). Without them the tool falls back gracefully: resume upload uses local
extraction, and scholarship results use the curated set.
