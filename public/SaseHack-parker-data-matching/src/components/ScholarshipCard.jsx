// One ranked scholarship match. Eligibility reasons come from deterministic
// rule signals. Optional retrieval diagnostics expose how hybrid search ranked it.

export default function ScholarshipCard({ match, rank }) {
  const { scholarship: s, score, reasons, retrieval, eligibility } = match
  const deadline = formatDeadline(s.deadline, s.recurring)
  const unresolved = eligibility?.status === 'needs_info'

  return (
    <article className="card sch-card">
      <div className="card-head">
        <div>
          {!unresolved && rank != null && <span className="rank">#{rank}</span>}
          <h3 className="card-title">{s.name}</h3>
          {s.sponsor && <p className="sch-sponsor">{s.sponsor}</p>}
        </div>
        <div className="sch-amount">
          <span className="savings-num">{formatAmount(s)}</span>
          {!unresolved && (
            <span className="score" title={retrieval ? 'Hybrid retrieval score' : 'Deterministic match score'}>
              score {score}
            </span>
          )}
        </div>
      </div>

      {eligibility?.status === 'needs_info' && (
        <div className="eligibility-warning">
          <strong>Needs more information</strong>
          <span>{eligibility.unknown.join(', ')}</span>
        </div>
      )}

      {s.description && <p className="card-summary">{s.description}</p>}

      {reasons.length > 0 && (
        <ul className="reasons" aria-label="Why this matched">
          {reasons.map((reason, index) => (
            <li key={index} className="reason">
              <span aria-hidden="true">✓</span> {reason}
            </li>
          ))}
        </ul>
      )}

      {retrieval && (
        <details className="retrieval-details">
          <summary>{unresolved ? 'Why we retrieved this' : 'Why it ranked here'}</summary>
          <div className="retrieval-metrics">
            <Metric label="Eligibility rules" value={retrieval.rule_score} />
            <Metric label="BM25" value={retrieval.lexical_score} />
            <Metric
              label="Semantic similarity"
              value={retrieval.semantic_similarity == null ? 'local' : retrieval.semantic_similarity}
            />
            <Metric label="RRF" value={retrieval.rrf_score} />
          </div>
        </details>
      )}

      <div className="card-foot">
        <a className="src-link" href={s.source_url} target="_blank" rel="noreferrer noopener">
          Official source ↗
        </a>
        <span className={'deadline deadline--' + deadline.level}>{deadline.label}</span>
      </div>
    </article>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatAmount(s) {
  const min = s.amount_min
  const max = s.amount_max
  if (!min && !max) return 'Varies'
  if (min && max && min !== max) return `$${k(min)} to $${k(max)}`
  return `$${k(max || min)}`
}

function k(n) {
  return Number(n).toLocaleString('en-US')
}

function formatDeadline(dateStr, recurring) {
  if (!dateStr) return { level: 'none', label: recurring ? 'Rolling / annual' : 'No deadline' }

  const days = Math.round(
    (new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000,
  )
  const nice = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (days < 0) return { level: 'none', label: recurring ? 'Reopens annually' : 'Closed' }
  if (days === 0) return { level: 'urgent', label: 'Due today' }
  if (days <= 60) return { level: 'urgent', label: `Due in ${days}d · ${nice}` }
  return { level: 'ok', label: `Due ${nice}` }
}
