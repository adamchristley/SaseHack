// Result card. Shows the offer, how to claim, what verification is needed,
// the source link, and, the differentiator, when we last verified it.

const VERIF_LABEL = {
  sheerid: 'SheerID',
  unidays: 'UNiDAYS',
  edu_email: '.edu email',
  manual: 'Student ID',
  none: 'No proof needed',
}

const CAT_LABEL = {
  software: 'Software', streaming: 'Streaming', retail: 'Retail', food: 'Food',
  transit: 'Transit', fitness: 'Fitness', tech: 'Tech', news: 'News',
}

export default function DiscountCard({ discount }) {
  const d = discount
  const fresh = freshness(d.verified_at)

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">{d.brand}</h3>
          <span className="chip chip--cat">{CAT_LABEL[d.category] || d.category}</span>
        </div>
        {d.est_annual_savings > 0 && (
          <div className="savings" title="Conservative estimated savings per year">
            <span className="savings-num">~${d.est_annual_savings}</span>
            <span className="savings-lbl">/ yr</span>
          </div>
        )}
      </div>

      <p className="card-summary">{d.summary}</p>

      <dl className="card-meta">
        <div>
          <dt>How to claim</dt>
          <dd>{d.how_to_claim}</dd>
        </div>
        <div>
          <dt>Proof required</dt>
          <dd><span className="chip chip--verif">{VERIF_LABEL[d.verification] || d.verification}</span></dd>
        </div>
      </dl>

      <div className="card-foot">
        <a className="src-link" href={d.source_url} target="_blank" rel="noreferrer noopener">
          Official source ↗
        </a>
        <span className={'freshness freshness--' + fresh.level} title={`Last verified ${d.verified_at}`}>
          <span className="dot" aria-hidden="true" /> {fresh.label}
        </span>
      </div>
    </article>
  )
}

// Turns verified_at into a human freshness badge. The plan's whole pitch: we
// report our own freshness instead of letting the list silently rot.
export function freshness(verifiedAt) {
  if (!verifiedAt) return { level: 'bad', label: 'Never verified' }
  const days = Math.round((Date.now() - new Date(verifiedAt).getTime()) / 86400000)
  if (days < 0) return { level: 'good', label: 'Verified' }
  if (days <= 30) return { level: 'good', label: `Verified ${days}d ago` }
  if (days <= 90) return { level: 'warn', label: `Verified ${days}d ago` }
  return { level: 'bad', label: `Last checked ${days}d ago` }
}
