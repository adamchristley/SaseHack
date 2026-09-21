import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
import { auth } from './firebase-config.js'
import { loadEmailOptIn, saveEmailOptIn } from './lib/userData.js'
import Home from './pages/Home.jsx'
import Discounts from './pages/Discounts.jsx'
import Scholarships from './pages/Scholarships.jsx'

export default function App() {
  const [tab, setTab] = useState('home')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u && u.emailVerified ? u : null)
    })
    return unsubscribe
  }, [])

  const firstName = user
    ? (user.displayName || user.email.split('@')[0]).split(' ')[0]
    : null

  const TABS = [
    { id: 'home', label: 'Home' },
    { id: 'discounts', label: 'Discounts' },
    { id: 'scholarships', label: 'Scholarships' },
    user
      ? { id: 'account', label: `Hi ${firstName}` }
      : { id: 'login', label: 'Log in' },
  ]

  function handleTabClick(id) {
    if (id === 'login') {
      window.location.href = '/login.html'
      return
    }
    setTab(id)
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('home')}>
          <span className="brand-mark" aria-hidden="true">⚡</span>
          <span className="brand-name">Charge&nbsp;Up Savings</span>
        </button>
        <nav className="tabs" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={'tab' + (tab === t.id ? ' tab--active' : '')}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => handleTabClick(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        {tab === 'home' && <Home onGo={setTab} />}
        {tab === 'discounts' && <Discounts user={user} />}
        {tab === 'scholarships' && <Scholarships user={user} />}
        {tab === 'account' && user && <AccountPanel user={user} />}
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

function AccountPanel({ user }) {
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

  async function handleLogout() {
    setSigningOut(true)
    try {
      await signOut(auth)
      window.location.href = '/login.html'
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
          checked={emailOptIn}
          disabled={!loaded}
          onChange={handleToggle}
          style={{ width: 18, height: 18, marginTop: 2, flex: 'none' }}
        />
        <span>
          <strong style={{ display: 'block', fontSize: 14 }}>Email me my best scholarship matches</strong>
          <small style={{ display: 'block', color: 'var(--text-dim)', marginTop: 2 }}>
            Based on your saved profile / uploaded resume. Sent weekly — you can turn this off any time.
          </small>
        </span>
      </label>

      <button className="btn" onClick={handleLogout} disabled={signingOut}>
        {signingOut ? 'Logging out…' : 'Logout'}
      </button>
    </section>
  )
}