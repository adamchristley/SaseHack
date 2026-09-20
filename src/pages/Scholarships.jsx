import { useMemo, useState } from 'react'
import scholarships from '../data/scholarships.js'
import { matchScholarships } from '../lib/matching.js'
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

export default function Scholarships() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)

  // Re-match on every profile edit. Deterministic + tiny dataset = instant.
  const matches = useMemo(() => matchScholarships(scholarships, profile, { limit: 8 }), [profile])
  const hasProfile = profile.majors.length || profile.affiliations.length ||
    profile.skills.length || profile.year_level || profile.gpa != null

  const topFive = matches.slice(0, 5)
  const rest = matches.slice(5)

  return (
    <section className="wrap">
      <div className="section-head">
        <h1 className="h1">Scholarship matcher</h1>
        <p className="lead">
          We filter {scholarships.length} real scholarships by eligibility rules, then
          rank what's left, and show you exactly why each one matched. The database
          matches, and no model ever invents an award.
        </p>
      </div>

      <div className="sch-layout">
        <div className="sch-sidebar">
          <ResumeUpload onProfile={setProfile} />
          <ProfilePanel
            profile={profile}
            onChange={setProfile}
            onLoadSample={() => setProfile(SAMPLE_PROFILE)}
            onClear={() => setProfile(EMPTY_PROFILE)}
          />
        </div>

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
                Every scholarship here stated a requirement your profile doesn't meet.
                Try broadening a major or adjusting your year level, or add more rows to the dataset.
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
