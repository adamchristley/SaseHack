import { useEffect, useMemo, useState } from 'react'
import scholarships from '../data/scholarships.js'
import { matchScholarships } from '../lib/matching.js'
import { advancedScholarshipMatches } from '../lib/hybridRetrieval.js'
import ProfilePanel from '../components/ProfilePanel.jsx'
import ResumeUpload from '../components/ResumeUpload.jsx'
import ScholarshipCard from '../components/ScholarshipCard.jsx'

const EMPTY_PROFILE = {
  majors: [], year_level: null, gpa: null, state: null, school: null,
  affiliations: [], skills: [], interests: [], work_experience: [],
}

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
  const [advanced, setAdvanced] = useState(null)
  const [rankingStatus, setRankingStatus] = useState('idle')

  const fallbackMatches = useMemo(
    () => matchScholarships(scholarships, profile, { limit: 8 }),
    [profile],
  )

  const hasProfile = profile.majors.length || profile.affiliations.length ||
    profile.skills.length || profile.interests.length || profile.work_experience.length ||
    profile.year_level || profile.gpa != null || profile.state || profile.school

  useEffect(() => {
    let cancelled = false
    let timer = null

    setAdvanced(null)
    if (!hasProfile) {
      setRankingStatus('idle')
      return () => {}
    }

    setRankingStatus('loading')
    timer = setTimeout(async () => {
      try {
        const result = await advancedScholarshipMatches(scholarships, profile, { limit: 8 })
        if (!cancelled) {
          setAdvanced(result)
          setRankingStatus(result.meta.mode)
        }
      } catch {
        if (!cancelled) setRankingStatus('rules')
      }
    }, 350)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [profile, hasProfile])

  const matches = advanced?.matches || fallbackMatches
  const topFive = matches.slice(0, 5)
  const rest = matches.slice(5)

  const rankingLabel = rankingStatus === 'hybrid'
    ? 'Hybrid ranking: BM25 + Gemini embeddings + RRF + eligibility rules'
    : rankingStatus === 'hybrid-local'
      ? 'Local hybrid ranking: BM25 + eligibility rules'
      : rankingStatus === 'loading'
        ? 'Building hybrid retrieval ranking...'
        : 'Deterministic eligibility ranking'

  return (
    <section className="wrap">
      <div className="section-head">
        <h1 className="h1">Scholarship matcher</h1>
        <p className="lead">
          We retrieve relevant scholarships, enforce explicit eligibility rules,
          then rank what remains and show exactly why each result surfaced.
          The model extracts profile facts, but it never invents an award or decides eligibility.
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
          {hasProfile && (
            <div className="ranking-status" role="status">
              <span className={'ranking-dot ranking-dot--' + (rankingStatus === 'hybrid' ? 'live' : 'local')} />
              {rankingLabel}
            </div>
          )}

          {!hasProfile ? (
            <div className="panel muted-panel results-hint">
              <p className="results-hint-title">Fill in your profile to see matches</p>
              <p>Or <button className="linkbtn" onClick={() => setProfile(SAMPLE_PROFILE)}>load the sample profile</button> to see it work instantly.</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No matches for this profile yet.</p>
              <p className="empty-body">
                Every scholarship here stated a requirement your profile does not meet.
                Try broadening a major or adjusting your year level, or add more rows to the dataset.
              </p>
            </div>
          ) : (
            <>
              <p className="result-label">Top {topFive.length} match{topFive.length === 1 ? '' : 'es'}</p>
              <div className="card-grid">
                {topFive.map((match, index) => (
                  <ScholarshipCard key={match.scholarship.id} match={match} rank={index + 1} />
                ))}
              </div>

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

              {advanced?.meta && (
                <details className="retrieval-meta">
                  <summary>Technical retrieval details</summary>
                  <div className="retrieval-meta-grid">
                    <span>Lexical retrieval</span><strong>{advanced.meta.lexical_method}</strong>
                    <span>Rank fusion</span><strong>{advanced.meta.fusion_method}</strong>
                    <span>Semantic model</span><strong>{advanced.meta.semantic_model || 'local fallback'}</strong>
                    <span>Rule weight</span><strong>{advanced.meta.weights.rules}</strong>
                    <span>Fusion weight</span><strong>{advanced.meta.weights.rrf}</strong>
                    <span>Semantic weight</span><strong>{advanced.meta.weights.semantic}</strong>
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
