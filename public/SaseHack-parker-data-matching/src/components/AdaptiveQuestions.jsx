import { useMemo, useState } from 'react'
import { getAdaptiveQuestions } from '../lib/adaptiveQuestions.js'

export default function AdaptiveQuestions({ needsInfo, profile, onChange }) {
  const [skipped, setSkipped] = useState([])

  const questions = useMemo(
    () => getAdaptiveQuestions(needsInfo, profile, 3, skipped),
    [needsInfo, profile, skipped],
  )

  if (!needsInfo?.length || !questions.length) return null

  const set = (patch) => onChange({ ...profile, ...patch })
  const skip = (key) => setSkipped((current) => [...new Set([...current, key])])

  return (
    <section className="panel adaptive-panel" aria-label="Improve scholarship matches">
      <div className="adaptive-head">
        <div>
          <p className="eyebrow">Optional follow-up</p>
          <h2 className="panel-title">Improve your matches</h2>
        </div>
        <span className="adaptive-count">{questions.length} quick question{questions.length === 1 ? '' : 's'}</span>
      </div>

      <p className="panel-hint">
        These answers can verify scholarships already in your results. Answer any,
        skip any, and the ranking updates automatically.
      </p>

      <div className="adaptive-list">
        {questions.map((question) => (
          <div className="adaptive-question" key={question.key}>
            <div className="adaptive-question-copy">
              <strong>{question.label}</strong>
              <span>
                Could clarify {question.affected_count} current scholarship{question.affected_count === 1 ? '' : 's'}
              </span>
            </div>

            <QuestionInput question={question} profile={profile} set={set} />

            <button
              type="button"
              className="btn btn--tiny btn--ghost adaptive-skip"
              onClick={() => skip(question.key)}
            >
              Skip
            </button>
          </div>
        ))}
      </div>

      <p className="adaptive-footnote">
        We never infer sensitive eligibility traits. You can add optional memberships
        or eligibility groups manually under Edit full profile.
      </p>
    </section>
  )
}

function QuestionInput({ question, profile, set }) {
  switch (question.key) {
    case 'gpa':
      return (
        <input
          className="adaptive-input"
          type="number"
          step="0.01"
          min="0"
          max="4"
          value={profile.gpa ?? ''}
          onChange={(e) => set({ gpa: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="e.g. 3.6"
          aria-label="GPA"
        />
      )

    case 'state':
      return (
        <input
          className="adaptive-input"
          value={profile.state || ''}
          onChange={(e) => set({ state: e.target.value.toUpperCase().slice(0, 2) || null })}
          placeholder="MI"
          maxLength={2}
          aria-label="Residency state"
        />
      )

    case 'age':
      return (
        <input
          className="adaptive-input"
          type="number"
          min="13"
          max="100"
          value={profile.age ?? ''}
          onChange={(e) => set({ age: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="e.g. 21"
          aria-label="Age"
        />
      )

    case 'citizenship':
      return (
        <select
          className="adaptive-input"
          value={profile.citizenship || ''}
          onChange={(e) => set({ citizenship: e.target.value || null })}
          aria-label="Citizenship or residency"
        >
          <option value="">Choose...</option>
          <option value="us_citizen">U.S. citizen</option>
          <option value="us_national">U.S. national</option>
          <option value="permanent_resident">Permanent resident</option>
          <option value="other">Other</option>
        </select>
      )

    case 'graduate_plan':
      return (
        <select
          className="adaptive-input"
          value={profile.graduate_plan || ''}
          onChange={(e) => set({ graduate_plan: e.target.value || null })}
          aria-label="Graduate study plans"
        >
          <option value="">Choose...</option>
          <option value="phd">Plan to pursue a PhD</option>
          <option value="research_grad">Research master's or PhD</option>
          <option value="other_grad">Other graduate/professional study</option>
          <option value="none">No graduate study planned</option>
        </select>
      )

    default:
      return null
  }
}
