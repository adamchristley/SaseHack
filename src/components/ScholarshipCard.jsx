// One ranked scholarship match. The reasons are the highest-value detail:
// explainable matching, generated from which filters/signals fired, never
// from an LLM. Every card links to the official source (scam-safety rule).

export default function ScholarshipCard({ match, rank }) {
  const { scholarship: s, score, reasons } = match
  const deadline = formatDeadline(s.deadline, s.recurring)

  return (
    <article className="card sch-card">
      <div className="card-head">
        <div>
          <span className="rank">#{rank}</span>
          <h3 className="card-title">{s.name}</h3>
          {s.sponsor && <p className="sch-sponsor">{s.sponsor}</p>}
        </div>
        <div className="sch-amount">
          <span className="savings-num">{formatAmount(s)}</span>
          <span className="score" title="Match score (deterministic)">score {score}</span>
        </div>
      </div>

      {s.description && <p className="card-summary">{s.description}</p>}

      {reasons.length > 0 && (
        <ul className="reasons" aria-label="Why this matched">
          {reasons.map((r, i) => (
            <li key={i} className="reason"><span aria-hidden="true">✓</span> {r}</li>
          ))}
        </ul>
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

function formatAmount(s) {
  const min = s.amount_min, max = s.amount_max
  if (!min && !max) return 'Varies'
  if (min && max && min !== max) return `$${k(min)} to $${k(max)}`
  return `$${k(max || min)}`
}
function k(n) { return Number(n).toLocaleString('en-US') }

function formatDeadline(dateStr, recurring) {
  if (!dateStr) return { level: 'none', label: recurring ? 'Rolling / annual' : 'No deadline' }
  const days = Math.round((new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000)
  const nice = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (days < 0) return { level: 'none', label: recurring ? 'Reopens annually' : 'Closed' }
  if (days === 0) return { level: 'urgent', label: 'Due today' }
  if (days <= 60) return { level: 'urgent', label: `Due in ${days}d · ${nice}` }
  return { level: 'ok', label: `Due ${nice}` }
}
