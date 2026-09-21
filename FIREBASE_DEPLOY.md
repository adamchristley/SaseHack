# Firebase deployment

This branch is based on `main` and adds a Firebase Functions backend for the two Gemini endpoints used by the React tool:

- `POST /api/resume-analyze`
- `POST /api/semantic-rank`

The browser still calls the same `/api/...` URLs. Firebase Hosting rewrites those requests to the `api` Cloud Function, so the Gemini API key stays server-side.

## One-time setup

From the repository root:

```powershell
npm install -g firebase-tools
firebase login
firebase use login-sasehack

cd functions
npm install
cd ..
```

Store the Gemini key as a Firebase secret:

```powershell
firebase functions:secrets:set GEMINI_API_KEY
```

Paste the key only when the Firebase CLI prompts for it. Do not put the key in GitHub, `public/`, a `VITE_*` variable, or frontend JavaScript.

## Deploy

```powershell
firebase deploy --only functions,hosting
```

Then open:

```text
https://login-sasehack.web.app/tool/
```

Upload a resume. A successful AI run should show:

```text
Gemini extraction · gemini-3.1-flash-lite
```

If it says `Local fallback extraction`, expand/read the Gemini fallback reason shown in the UI.

## Notes

- The Firebase project is `login-sasehack`.
- Cloud Functions uses Node.js 20.
- The Gemini secret is bound only to the `api` function.
- Firebase Hosting rewrites `/api/**` to the backend function.
- The existing local development flow under `app/` is unchanged.
