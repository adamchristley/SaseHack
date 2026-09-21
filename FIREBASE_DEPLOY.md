# Firebase Spark deployment

This branch uses Firebase Hosting plus Firebase AI Logic with the Gemini Developer API. It does not require Cloud Functions or a Blaze billing plan.

The React tool calls Gemini through the Firebase AI Logic browser SDK. Firebase's proxy keeps the Gemini Developer API key off the client.

## One-time setup

In the Firebase console for `login-sasehack`:

1. Go to **AI Services > AI Logic** and finish the Gemini Developer API setup.
2. Go to **Security > App Check > Apps**.
3. Register the web app with **reCAPTCHA Enterprise** if it is not already registered.
4. Copy the public reCAPTCHA Enterprise site key.

The Spark plan supports App Check with reCAPTCHA Enterprise within its no-cost quota.

## Local build

From the repository root:

```powershell
cd app
npm install
```

Create `app/.env.local` with the public App Check site key:

```text
VITE_FIREBASE_APPCHECK_SITE_KEY=your_recaptcha_enterprise_site_key
```

This is a public site key, not a Gemini API key.

Then build:

```powershell
npm run build
cd ..
```

The build writes the React tool into `public/tool/`.

## Deploy

```powershell
firebase use login-sasehack
firebase deploy --only hosting
```

Then open:

```text
https://login-sasehack.web.app/tool/
```

Upload a resume. A successful run should show:

```text
Gemini extraction · gemini-3.1-flash-lite
```

If it says `Local fallback extraction`, read the fallback reason shown in the UI.

## Localhost and App Check

When running Vite locally, the code enables Firebase's App Check debug mode. The browser console will print a debug token. Register that token in **Firebase Console > Security > App Check > Apps > Manage debug tokens** before expecting Firebase AI Logic to work on localhost.

## Ranking on the Spark deployment

Resume understanding uses Gemini through Firebase AI Logic. Deterministic eligibility and BM25 ranking remain active in the browser.

The server-side Gemini embedding endpoint is not used on the Spark deployment because it requires a backend. The embedding/RRF/Bayesian-ranking implementation remains in the repository and can still be demonstrated locally with the existing Node API setup.
