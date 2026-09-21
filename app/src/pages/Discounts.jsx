import { useMemo, useState, useEffect } from 'react'
import discounts from '../data/discounts.js'
import { searchDiscounts, featuredDiscounts, categories } from '../lib/search.js'
import DiscountCard from '../components/DiscountCard.jsx'

// Exactly two states (plan): no query -> featured set; any query -> closest
// matches only. Back to empty input -> back to featured. No third state.
export default function Discounts() {
  const [raw, setRaw] = useState('')
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(null)

  // Debounced type-ahead (~200ms) so results feel instant without thrashing.
  useEffect(() => {
    const t = setTimeout(() => setQuery(raw), 200)
    return () => clearTimeout(t)
  }, [raw])

  const cats = useMemo(() => categories(discounts), [])
  const featured = useMemo(() => featuredDiscounts(discounts), [])
  const results = useMemo(() => searchDiscounts(discounts, query), [query])

  const searching = query.trim().length > 0
  const list = searching
    ? results
    : activeCat
      ? featured.filter((d) => d.category === activeCat)
      : featured

  return (
    <section className="wrap">
      <div className="section-head">
        <h1 className="h1">Student discounts</h1>
        <p className="lead">
          Type a company you already pay for. We only count savings on things you
          actually use, no inflated totals.
        </p>
      </div>

      <div className="searchbar">
        <span className="search-icon" aria-hidden="true">🔎</span>
        <input
          className="search-input"
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Try “spotify”, “adobe”, or even “chipotel”…"
          aria-label="Search for a company"
          autoComplete="off"
        />
        {raw && (
          <button className="search-clear" onClick={() => setRaw('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      {!searching && (
        <div className="chips" role="group" aria-label="Filter by category">
          <button
            className={'chip chip--btn' + (activeCat === null ? ' chip--on' : '')}
            onClick={() => setActiveCat(null)}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c.category}
              className={'chip chip--btn' + (activeCat === c.category ? ' chip--on' : '')}
              onClick={() => setActiveCat(activeCat === c.category ? null : c.category)}
            >
              {c.category} <span className="chip-count">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {!searching && (
        <p className="result-label">Featured brands worth knowing about</p>
      )}
      {searching && list.length > 0 && (
        <p className="result-label">{list.length} match{list.length === 1 ? '' : 'es'} for “{query.trim()}”</p>
      )}

      {list.length > 0 ? (
        <div className="card-grid">
          {list.map((d) => <DiscountCard key={d.id} discount={d} />)}
        </div>
      ) : (
        <EmptyState query={query.trim()} />
      )}
    </section>
  )
}

// A real empty state: turn a dead end into demand data. The plan calls for a
// missing_requests table; client-side we log to localStorage so the demo can
// show captured demand. (Swap for POST /api/requests when the backend lands.)
function EmptyState({ query }) {
  const [sent, setSent] = useState(false)

  function request() {
    try {
      const key = 'missing_requests'
      const prev = JSON.parse(localStorage.getItem(key) || '[]')
      prev.push({ company: query, at: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(prev))
    } catch { /* ignore storage errors */ }
    setSent(true)
  }

  return (
    <div className="empty">
      <p className="empty-title">We don't have <strong>“{query}”</strong> yet.</p>
      {!sent ? (
        <>
          <p className="empty-body">
            Tell us and we'll go find it. Every request is demand data we can act on.
          </p>
          <button className="btn btn--gold" onClick={request}>
            Request “{query}” →
          </button>
        </>
      ) : (
        <p className="empty-body empty-ok">
          ✓ Logged. Thanks. This is exactly the demand signal that decides what we add next.
        </p>
      )}
    </div>
  )
}
