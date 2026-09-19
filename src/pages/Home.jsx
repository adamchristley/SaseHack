import discounts from '../data/discounts.js'
import scholarships from '../data/scholarships.js'

// One screen: what the app is, and entry points into both tools.
export default function Home({ onGo }) {
  const brandCount = new Set(discounts.map((d) => d.brand)).size
  const schCount = scholarships.length

  return (
    <section className="wrap">
      <div className="hero">
        <p className="eyebrow">SASEhack 2026 · Michigan Tech</p>
        <h1 className="hero-title">
          Find the money you're <span className="accent">already entitled to.</span>
        </h1>
        <p className="lead">
          Students lose money to <em>not knowing</em>, not to overspending. This finds
          the student discounts hiding at companies you already pay for, and the
          scholarships you're actually eligible for — each one with a real source and
          a date we last checked it.
        </p>
        <div className="cta-row">
          <button className="btn btn--gold" onClick={() => onGo('discounts')}>
            Find student discounts →
          </button>
          <button className="btn btn--ghost" onClick={() => onGo('scholarships')}>
            Match me to scholarships →
          </button>
        </div>
      </div>

      <div className="feature-grid">
        <FeatureCard
          onClick={() => onGo('discounts')}
          kicker="Discount finder"
          title="Does a company you pay for have a student discount?"
          body="Type the brand — Spotify, Adobe, Amazon. Get a yes/no, how to claim it, and when we last verified the offer. Typo-tolerant: “chipotel” still finds it."
          stat={`${brandCount} brands`}
        />
        <FeatureCard
          onClick={() => onGo('scholarships')}
          kicker="Scholarship matcher"
          title="Which scholarships are you actually eligible for?"
          body="Fill a quick profile (or paste one from a resume). We filter by real eligibility rules and rank matches — each one shows exactly why it matched."
          stat={`${schCount} scholarships`}
        />
      </div>

      <div className="why-strip">
        <Why title="Freshness is the feature">
          Every result carries a <strong>last-verified date</strong> and a link to the
          source. Dead links are why other lists are useless — we check ours.
        </Why>
        <Why title="Explainable matching">
          Scholarship matches are ranked by <strong>deterministic rules</strong>, not a
          black box. Every match lists its reasons.
        </Why>
        <Why title="Safe by design">
          Never a scholarship with an application fee. Every award links to its
          official source. Your profile is never stored.
        </Why>
      </div>
    </section>
  )
}

function FeatureCard({ kicker, title, body, stat, onClick }) {
  return (
    <button className="feature-card" onClick={onClick}>
      <div className="feature-top">
        <span className="feature-kicker">{kicker}</span>
        <span className="pill">{stat}</span>
      </div>
      <h2 className="feature-title">{title}</h2>
      <p className="feature-body">{body}</p>
      <span className="feature-go">Open →</span>
    </button>
  )
}

function Why({ title, children }) {
  return (
    <div className="why">
      <h3 className="why-title">{title}</h3>
      <p className="why-body">{children}</p>
    </div>
  )
}
