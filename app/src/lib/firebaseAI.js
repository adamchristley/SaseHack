import { initializeApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check'

const firebaseConfig = {
  apiKey: 'AIzaSyBNENu4wgBH_0Oyj9yEiT83r7Cn8yIx4wA',
  authDomain: 'login-sasehack.firebaseapp.com',
  projectId: 'login-sasehack',
  appId: '1:480797784311:web:6e0d2d46891760fa67bbf2',
}

let firebaseAIApp

export function getFirebaseAIApp() {
  if (firebaseAIApp) return firebaseAIApp

  // Use a named app so the existing Firebase 10 auth/firestore integration can
  // remain untouched while the scholarship tool uses the current Firebase AI SDK.
  firebaseAIApp = initializeApp(firebaseConfig, 'charge-up-ai')

  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
  if (siteKey && typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    }

    initializeAppCheck(firebaseAIApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
  }

  return firebaseAIApp
}
