import { useEffect, useMemo, useRef, useState } from 'react'
import curated from '../data/scholarships.js'
import { matchScholarships } from '../lib/matching.js'
import { mergeByName } from '../lib/mergeScholarships.js'
import { searchNational } from '../lib/scholarshipApi.js'
import ProfilePanel from '../components/ProfilePanel.jsx'
import ScholarshipCard from '../components/ScholarshipCard.jsx'

const EMPTY_PROFILE = {
  majors: [], year_level: null, gpa: null, state: null, school: null,
  affiliations: [], skills: [], interests: [], work_experience: [],
}

// A realistic profile to make the demo one click. Mirrors the plan's example
// StudentProfile JSON, the kind of thing the extractor would produce.
const SAMPLE_PROFILE = {
  majors: ['computer science'],
  year_level: 'junior',
  gpa: 3.6,
  state: 'MI',
  school: 'Michigan Technological University',
  affiliations: ['SASE', 'first-generation'],
  skills: ['python', 'docker', 'postgres'],
  interests: ['systems programming', 'networking'],
  work_experience: ['IT help desk'],
}

// Keyword we send to the national database, derived from the profile.
function queryFromProfile(p) {
  return (p.majors[0] || p.interests[0] || p.skills[0] || '').trim()
}

export default function Scholarships() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [national, setNational] = useState([])
  const [api, setApi] = useState({ state: 'idle', fetchedAt: null, error: null }) // idle|loading|ok|error
  const abortRef = useRef(null)

  const query = queryFromProfile(profile)
  const hasProfile = profile.majors.length || profile.affiliations.length ||
    profile.skills.length || profile.year_level || profile.gpa != null

  // Live-query the national database when the derived keyword changes.
  // Debounced, abortable, and it never blocks the curated results.
  useEffect(() => {
    if (!query) { setNational([]); setApi({ state: 'idle', fetchedAt: null, error: null }); return }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setApi((a) => ({ ...a, state: 'loading', error: null }))
      try {
        const data = await searchNational(query, { signal: controller.signal })
        setNational(data.scholarships)
        setApi({ state: 'ok', fetchedAt: data.fetched_at, error: null })
      } catch (err) {
        if (controller.signal.aborted) return // superseded by a newer query
        setNational([]) // fall back to curated only
        setApi({ state: 'error', fetchedAt: null, error: String(err.message || err) })
      }
    }, 400)

    return () => clearTimeout(t)
  }, [query])

  const combined = useMemo(() => mergeByName(curated, national), [national])
  const matches = useMemo(() => matchScholarships(combined, profile, { limit: 12 }), [combined, profile])

  const topFive = matches.slice(0, 5)
  const rest = matches.slice(5)

  return (
    <section className="wrap">
      <div className="section-head">
        <h1 className="h1">Scholarship matcher</h1>
        <p className="lead">
          We filter your matches against {curated.length} curated scholarships plus
          the live national database, rank what's left, and show you exactly why
          each one matched. The database matches, and no model ever invents an award.
        </p>
        <p className="data-note">{sourceLabel(api, national.length)}</p>
      </div>

      <div className="sch-layout">
        <ProfilePanel
          profile={profile}
          onChange={setProfile}
          onLoadSample={() => setProfile(SAMPLE_PROFILE)}
          onClear={() => setProfile(EMPTY_PROFILE)}
        />

        <div className="sch-results">
          {!hasProfile ? (
            <div className="panel muted-panel results-hint">
              <p className="results-hint-title">Fill in your profile to see matches</p>
              <p>Or <button className="linkbtn" onClick={() => setProfile(SAMPLE_PROFILE)}>load the sample profile</button> to see it work instantly.</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No matches for this profile yet.</p>
              <p className="empty-body">
                Every scholarship checked stated a requirement your profile doesn't meet.
                Try broadening a major or adjusting your year level.
              </p>
            </div>
          ) : (
            <>
              <p className="result-label">Top {topFive.length} match{topFive.length === 1 ? '' : 'es'}</p>
              <div className="card-grid">
                {topFive.map((m, i) => (
                  <ScholarshipCard key={m.scholarship.id} match={m} rank={i + 1} />
                ))}
              </div>
              {rest.length > 0 && (
                <details className="more">
                  <summary>Show {rest.length} more eligible</summary>
                  <div className="card-grid">
                    {rest.map((m, i) => (
                      <ScholarshipCard key={m.scholarship.id} match={m} rank={i + 6} />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function sourceLabel(api, nationalCount) {
  if (api.state === 'loading') return 'Searching the national database…'
  if (api.state === 'ok') return `Live: ${nationalCount} national result${nationalCount === 1 ? '' : 's'} added${api.fetchedAt ? `, as of ${api.fetchedAt}` : ''}.`
  if (api.state === 'error') return 'National database unavailable right now, showing the curated set.'
  return 'Curated set. Add a major or interest to pull live national results.'
}
