import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
import { auth } from './firebase-config.js'
import {
  loadEmailOptIn,
  saveEmailOptIn,
  loadStoreData,
  saveStoreData,
} from './lib/userData.js'
import Home from './pages/Home.jsx'
import Discounts from './pages/Discounts.jsx'
import Scholarships from './pages/Scholarships.jsx'

// One connected site: the marketing page (served at /) is the homepage, and
// this React tool lives at /tool/. The brand returns to the homepage, Log in
// goes to the marketing site's Firebase auth, and the section tabs deep-link
// via the URL hash (/tool/#discounts) so the homepage can open them directly.
const SECTIONS = ['home', 'discounts', 'scholarships', 'account']

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'scholarships', label: 'Scholarships' },
]

const tabFromHash = () => {
  const h = (window.location.hash || '').replace('#', '')
  return SECTIONS.includes(h) ? h : 'home'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [user, setUser] = useState(null)
  // null while Firebase is still deciding, so we don't flash "Log in" at
  // someone who is already signed in.
  const [authChecked, setAuthChecked] = useState(false)
  // Consent to keep the profile in Firestore: null = still loading.
  const [storageAllowed, setStorageAllowed] = useState(null)

  const go = (id) => {
    setTab(id)
    window.location.hash = id === 'home' ? '' : id
  }

  // Absolute nav so it works whether the tool is at /tool/ or the dev root.
  const goHome = () => { window.location.href = '/' }
  const goLogin = () => { window.location.href = '/login.html' }

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u && u.emailVerified ? u : null)
      setAuthChecked(true)
    })
  }, [])

  // Keep the tab in sync with the URL hash (supports deep links + back button).
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!user) {
      setStorageAllowed(null)
      return
    }
    let cancelled = false
    setStorageAllowed(null)
    loadStoreData(user.uid)
      .then((allowed) => { if (!cancelled) setStorageAllowed(allowed) })
      .catch((err) => {
        console.error('STORAGE CONSENT LOAD ERROR:', err)
        if (!cancelled) setStorageAllowed(false)
      })
    return () => { cancelled = true }
  }, [user])

  // Signing out while on the account tab would leave an empty page.
  useEffect(() => {
    if (tab === 'account' && authChecked && !user) go('home')
  }, [tab, authChecked, user])

  const firstName = user
    ? (user.displayName || user.email.split('@')[0]).split(' ')[0]
    : null

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <img className="brand-mark" src="/images/icon.png" alt="" aria-hidden="true" />
          <span className="brand-name">Charge&nbsp;Up Savings</span>
        </button>
        <nav className="tabs" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={'tab' + (tab === t.id ? ' tab--active' : '')}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => go(t.id)}
            >
              {t.label}
            </button>
          ))}
          {user ? (
            <button
              className={'tab' + (tab === 'account' ? ' tab--active' : '')}
              aria-current={tab === 'account' ? 'page' : undefined}
              onClick={() => go('account')}
            >
              Hi {firstName}
            </button>
          ) : (
            <button className="tab" onClick={goLogin}>Log in</button>
          )}
        </nav>
      </header>

      <main className="page">
        {tab === 'home' && <Home onGo={go} />}
        {tab === 'discounts' && <Discounts user={user} />}
        {tab === 'scholarships' && (
          <Scholarships user={user} storageAllowed={storageAllowed} />
        )}
        {tab === 'account' && user && (
          <AccountPanel
            user={user}
            storageAllowed={storageAllowed}
            onStorageAllowedChange={setStorageAllowed}
          />
        )}
      </main>

      <footer className="footer">
        <span>SASEhack 2026 · Michigan Tech</span>
        <span className="footer-dim">
          Built for first-gen &amp; low-income students — money you're already entitled to.
        </span>
      </footer>
    </div>
  )
}

function AccountPanel({ user, storageAllowed, onStorageAllowedChange }) {
  const [signingOut, setSigningOut] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load the saved checkbox state once, on mount.
  useEffect(() => {
    let cancelled = false
    loadEmailOptIn(user.uid).then((val) => {
      if (!cancelled) {
        setEmailOptIn(val)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [user.uid])

  async function handleToggle(e) {
    const checked = e.target.checked
    setEmailOptIn(checked) // update UI immediately
    await saveEmailOptIn(user.uid, checked) // persist to Firestore
  }

  async function handleStorageToggle(e) {
    const checked = e.target.checked
    onStorageAllowedChange(checked)
    try {
      await saveStoreData(user.uid, checked)
    } catch (err) {
      console.error('STORAGE CONSENT SAVE ERROR:', err)
      onStorageAllowedChange(!checked)
    }
  }

  async function handleLogout() {
    setSigningOut(true)
    try {
      await signOut(auth)
      window.location.href = '/index.html'
    } catch (err) {
      console.error('LOGOUT ERROR:', err)
      setSigningOut(false)
    }
  }

  return (
    <section className="wrap narrow">
      <h1 className="h1">Account</h1>
      <div className="panel muted-panel">
        <p>Signed in as <strong>{user.displayName || user.email}</strong></p>
        {user.displayName && <p>{user.email}</p>}
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={storageAllowed === true}
          disabled={storageAllowed === null}
          onChange={handleStorageToggle}
          style={{ width: 18, height: 18, marginTop: 2, flex: 'none' }}
        />
        <span>
          <strong style={{ display: 'block', fontSize: 14 }}>Save my profile</strong>
          <small style={{ display: 'block', color: 'var(--text-dim)', marginTop: 2 }}>
            Keeps the facts from your resume so your matches are waiting next time.
            Turning this off deletes the saved profile.
          </small>
        </span>
      </label>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={emailOptIn}
          disabled={!loaded}
          onChange={handleToggle}
          style={{ width: 18, height: 18, marginTop: 2, flex: 'none' }}
        />
        <span>
          <strong style={{ display: 'block', fontSize: 14 }}>Email me my best scholarship matches</strong>
          <small style={{ display: 'block', color: 'var(--text-dim)', marginTop: 2 }}>
            Sent weekly, built from your saved profile, so it needs "Save my profile"
            on as well. You can turn this off any time.
          </small>
        </span>
      </label>

      <button className="btn" onClick={handleLogout} disabled={signingOut}>
        {signingOut ? 'Logging out…' : 'Logout'}
      </button>
    </section>
  )
}
