import { useState } from 'react'
import Home from './pages/Home.jsx'
import Discounts from './pages/Discounts.jsx'
import Scholarships from './pages/Scholarships.jsx'

// Four tabs in the plan. Parker owns Discounts + Scholarships; Home is a light
// landing that routes into both. Login is the auth teammate's tab — stubbed
// here so the shell is complete and nothing is gated behind it.
const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'login', label: 'Log in' },
]

export default function App() {
  const [tab, setTab] = useState('home')

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
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        {tab === 'home' && <Home onGo={setTab} />}
        {tab === 'discounts' && <Discounts />}
        {tab === 'scholarships' && <Scholarships />}
        {tab === 'login' && <LoginStub />}
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

// Placeholder only. The auth teammate owns this tab; nothing depends on it.
function LoginStub() {
  return (
    <section className="wrap narrow">
      <h1 className="h1">Log in</h1>
      <p className="lead">
        Optional. Both tools work fully without an account — login just saves your
        finds for later. This tab is owned by the auth teammate.
      </p>
      <div className="panel muted-panel">
        <p>Nothing is ever gated behind login. This is a placeholder for the auth teammate's email capture.</p>
      </div>
    </section>
  )
}
