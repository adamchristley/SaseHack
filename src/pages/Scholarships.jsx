import { useEffect, useMemo, useState } from 'react'
import scholarships from '../data/scholarships.js'
import { matchScholarships } from '../lib/matching.js'
import { advancedScholarshipMatches } from '../lib/hybridRetrieval.js'
import ProfilePanel from '../components/ProfilePanel.jsx'
import ResumeUpload from '../components/ResumeUpload.jsx'
import ScholarshipCard from '../components/ScholarshipCard.jsx'
import AdaptiveQuestions from '../components/AdaptiveQuestions.jsx'

const EMPTY_PROFILE = {
  majors: [], year_level: null, gpa: null, state: null, school: null,
  age: null, citizenship: null, graduate_plan: null,
  affiliations: [], skills: [], interests: [], work_experience: [],
}

const SAMPLE_PROFILE = {
  majors: ['computer science'],
  year_level: 'junior',
  gpa: 3.6,
  state: 'MI',
  school: 'Michigan Technological University',
  age: 21,
  citizenship: 'us_citizen',
  graduate_plan: 'phd',
  affiliations: ['SASE', 'first-generation'],
  skills: ['python', 'docker', 'postgres'],
  interests: ['systems programming', 'networking'],
  work_experience: ['IT help desk'],
}

export default function Scholarships() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [advanced, setAdvanced] = useState(null)

  const fallbackMatches = useMemo(
    () => matchScholarships(scholarships, profile, { limit: 8 }),
    [profile],
  )

  const hasProfile = profile.majors.length || profile.affiliations.length ||
    profile.skills.length || profile.interests.length || profile.work_experience.length ||
    profile.year_level || profile.gpa != null || profile.state || profile.school ||
    profile.age != null || profile.citizenship || profile.graduate_plan

  useEffect(() => {
    let cancelled = false
    let timer = null

    setAdvanced(null)
    if (!hasProfile) {
      return () => {}
    }
    timer = setTimeout(async () => {
      try {
        const result = await advancedScholarshipMatches(scholarships, profile, { limit: 8 })
        if (!cancelled) {
          setAdvanced(result)
        }
      } catch {
        // The deterministic fallback remains available through fallbackMatches.
      }
    }, 350)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [profile, hasProfile])

  const fallbackConfirmed = fallbackMatches.filter((match) => match.eligibility?.status === 'eligible')
  const fallbackNeedsInfo = fallbackMatches.filter((match) => match.eligibility?.status === 'needs_info')
  const matches = advanced?.matches || fallbackConfirmed
  const needsInfo = advanced?.needs_info || fallbackNeedsInfo
  const topFive = matches.slice(0, 5)
  const rest = matches.slice(5)

  return (
    <section className="wrap">
      <div className="section-head">
        <h1 className="h1">Scholarship matcher</h1>
        <p className="lead">
          Upload your resume to find scholarships that fit your background.
          We show what matches, what still needs verification, and link every result
          to its official source.
        </p>
      </div>

      <div className="sch-layout">
        <div className="sch-sidebar">
          <ResumeUpload onProfile={setProfile} />

          <details className="profile-editor">
            <summary>Edit full profile</summary>
            <ProfilePanel
              profile={profile}
              onChange={setProfile}
              onLoadSample={() => setProfile(SAMPLE_PROFILE)}
              onClear={() => setProfile(EMPTY_PROFILE)}
            />
          </details>
        </div>

        <div className="sch-results">
          {hasProfile && (
            <AdaptiveQuestions
              needsInfo={needsInfo}
              profile={profile}
              onChange={setProfile}
            />
          )}

          {!hasProfile ? (
            <div className="panel muted-panel results-hint">
              <p className="results-hint-title">Fill in your profile to see matches</p>
              <p>Or <button className="linkbtn" onClick={() => setProfile(SAMPLE_PROFILE)}>load the sample profile</button> to see it work instantly.</p>
            </div>
          ) : matches.length === 0 && needsInfo.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No matches for this profile yet.</p>
              <p className="empty-body">
                The current dataset does not contain a scholarship whose known requirements fit this profile.
              </p>
            </div>
          ) : (
            <>
              {topFive.length > 0 && (
                <p className="result-label">Strong matches · {topFive.length}</p>
              )}
              {topFive.length > 0 && (
                <div className="card-grid">
                  {topFive.map((match, index) => (
                    <ScholarshipCard key={match.scholarship.id} match={match} rank={index + 1} />
                  ))}
                </div>
              )}

              {rest.length > 0 && (
                <details className="more">
                  <summary>Show {rest.length} more eligible</summary>
                  <div className="card-grid">
                    {rest.map((match, index) => (
                      <ScholarshipCard key={match.scholarship.id} match={match} rank={index + 6} />
                    ))}
                  </div>
                </details>
              )}

              {needsInfo.length > 0 && (
                <details className="more potential-matches">
                  <summary>{needsInfo.length} potential match{needsInfo.length === 1 ? '' : 'es'} need verification</summary>
                  <p className="potential-note">
                    These are not confirmed matches. The resume does not provide one or more required facts, so we keep them separate instead of assuming eligibility.
                  </p>
                  <div className="card-grid">
                    {needsInfo.map((match) => (
                      <ScholarshipCard key={match.scholarship.id} match={match} />
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
