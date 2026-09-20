// Editable StudentProfile panel.
//
// In the full app the extractor teammate fills this from a resume via
// POST /api/resume. Parker's matcher doesn't care where the profile came
// from, so this panel doubles as (a) the plan's "editable profile" that turns
// an extraction error into a two-second fix, and (b) the survey fallback for
// users with no resume. The field names ARE the frozen contract.

const YEARS = ['freshman', 'sophomore', 'junior', 'senior', 'grad']

// Comma-separated text <-> string[] for the list fields.
const toList = (str) => str.split(',').map((x) => x.trim()).filter(Boolean)
const fromList = (arr) => (Array.isArray(arr) ? arr.join(', ') : '')

export default function ProfilePanel({ profile, onChange, onLoadSample, onClear }) {
  const set = (patch) => onChange({ ...profile, ...patch })

  return (
    <div className="panel profile-panel">
      <div className="panel-head">
        <h2 className="panel-title">Your profile</h2>
        <div className="panel-actions">
          <button className="btn btn--tiny" onClick={onLoadSample}>Load sample</button>
          <button className="btn btn--tiny btn--ghost" onClick={onClear}>Clear</button>
        </div>
      </div>
      <p className="panel-hint">
        Extraction gets things wrong, so edit anything and matches re-rank
        instantly. Nothing here is stored.
      </p>

      <div className="form-grid">
        <Field label="Major(s)" hint="comma-separated">
          <input
            value={fromList(profile.majors)}
            onChange={(e) => set({ majors: toList(e.target.value) })}
            placeholder="computer science, data science"
          />
        </Field>

        <Field label="Year level">
          <select value={profile.year_level || ''} onChange={(e) => set({ year_level: e.target.value || null })}>
            <option value="">Any</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>

        <Field label="GPA">
          <input
            type="number" step="0.1" min="0" max="4"
            value={profile.gpa ?? ''}
            onChange={(e) => set({ gpa: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="3.6"
          />
        </Field>

        <Field label="State" hint="2-letter">
          <input
            value={profile.state || ''}
            onChange={(e) => set({ state: e.target.value.toUpperCase().slice(0, 2) || null })}
            placeholder="MI"
          />
        </Field>

        <Field label="School" wide>
          <input
            value={profile.school || ''}
            onChange={(e) => set({ school: e.target.value || null })}
            placeholder="Michigan Technological University"
          />
        </Field>

        <Field label="Affiliations" hint="SASE, first-generation, veteran…" wide>
          <input
            value={fromList(profile.affiliations)}
            onChange={(e) => set({ affiliations: toList(e.target.value) })}
            placeholder="SASE, first-generation"
          />
        </Field>

        <Field label="Skills" hint="powers keyword matching" wide>
          <input
            value={fromList(profile.skills)}
            onChange={(e) => set({ skills: toList(e.target.value) })}
            placeholder="python, docker, postgres"
          />
        </Field>

        <Field label="Interests" wide>
          <input
            value={fromList(profile.interests)}
            onChange={(e) => set({ interests: toList(e.target.value) })}
            placeholder="systems programming, networking"
          />
        </Field>
      </div>
    </div>
  )
}

function Field({ label, hint, wide, children }) {
  return (
    <label className={'field' + (wide ? ' field--wide' : '')}>
      <span className="field-label">
        {label}{hint && <span className="field-hint"> · {hint}</span>}
      </span>
      {children}
    </label>
  )
}
