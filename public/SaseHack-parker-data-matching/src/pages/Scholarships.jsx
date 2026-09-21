import { useEffect, useMemo, useRef, useState } from 'react'
import scholarships from '../data/scholarships.js'
import { matchScholarships } from '../lib/matching.js'
import { advancedScholarshipMatches } from '../lib/hybridRetrieval.js'
import ProfilePanel from '../components/ProfilePanel.jsx'
import ResumeUpload from '../components/ResumeUpload.jsx'
import ScholarshipCard from '../components/ScholarshipCard.jsx'
import AdaptiveQuestions from '../components/AdaptiveQuestions.jsx'
import { alertNewGoodScholarships } from '../lib/notify.js'
import { loadProfile, saveProfile } from '../lib/userData.js'

const EMPTY_PROFILE = {
  majors: [], year_level: null, gpa: null, state: null, school: null,
  age: null, citizenship: null, graduate_plan: null,
  affiliations: [], skills: [], interests: [], work_experience: [],
}

// True once the profile has at least one filled-in field.
function hasProfileData(p) {
  return Boolean(
    (p.majors || []).length || (p.affiliations || []).length ||
    (p.skills || []).length || (p.interests || []).length ||
    (p.work_experience || []).length ||
    p.year_level || p.gpa != null || p.state || p.school ||
    p.age != null || p.citizenship || p.graduate_plan,
  )
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

export default function Scholarships({ user, storageAllowed }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [advanced, setAdvanced] = useState(null)
  const [rankingStatus, setRankingStatus] = useState('idle')
  const [profileLoaded, setProfileLoaded] = useState(false) // saved profile fetched (or none exists)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const profileRef = useRef(profile)
  profileRef.current = profile
  const lastSaved = useRef(JSON.stringify(EMPTY_PROFILE))
  const uid = user?.uid
  const email = user?.email
  const canStore = Boolean(user) && storageAllowed === true // opted in at login

  const fallbackMatches = useMemo(
    () => matchScholarships(scholarships, profile, { limit: 8 }),
    [profile],
  )

  const hasProfile = hasProfileData(profile)

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

  const fallbackConfirmed = fallbackMatches.filter((match) => match.eligibility?.status === 'eligible')
  const fallbackNeedsInfo = fallbackMatches.filter((match) => match.eligibility?.status === 'needs_info')
  const matches = advanced?.matches || fallbackConfirmed
  const needsInfo = advanced?.needs_info || fallbackNeedsInfo
  const topFive = matches.slice(0, 5)
  const rest = matches.slice(5)

  // Opted in: bring back the profile saved last time.
  useEffect(() => {
    setProfileLoaded(false)
    if (!uid || !canStore) return
    let cancelled = false
    loadProfile(uid)
      .then((saved) => {
        if (cancelled) return
        if (saved && !hasProfileData(profileRef.current)) {
          const restored = { ...EMPTY_PROFILE, ...saved }
          lastSaved.current = JSON.stringify(restored)
          setProfile(restored)
        }
        setProfileLoaded(true)
      })
      .catch((err) => {
        console.error('PROFILE LOAD ERROR:', err)
        if (!cancelled) setProfileLoaded(true)
      })
    return () => { cancelled = true }
  }, [uid, canStore])

  // Opted in: save the profile ~1s after the last edit. Clearing the profile
  // saves the empty profile, so what's stored always matches what's shown.
  useEffect(() => {
    if (!uid || !email || !canStore || !profileLoaded) return
    const snapshot = JSON.stringify(profile)
    if (snapshot === lastSaved.current) return

    setSaveState('saving')
    const timer = setTimeout(async () => {
      try {
        await saveProfile(uid, profile)
        lastSaved.current = snapshot
        setSaveState('saved')
      } catch (err) {
        console.error('PROFILE SAVE ERROR:', err)
        setSaveState('error')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [profile, uid, email, canStore, profileLoaded])

  // Match emails (original behaviour). Opted-in users only, because the
  // "already emailed" list has to be stored to avoid re-sending.
  useEffect(() => {
    if (canStore && user?.uid && user?.email && topFive.length > 0) {
      alertNewGoodScholarships(topFive, user.uid, user.email)
    }
  }, [topFive, user, canStore])

  const saveLabel = !user
    ? 'Log in to save your profile'
    : storageAllowed === null
      ? 'Checking your save settings...'
      : !canStore
        ? "Your profile isn't being saved. Turn on “Save my profile” on your account page to save it."
        : !profileLoaded
          ? 'Checking for a saved profile...'
          : saveState === 'saving'
            ? 'Saving your profile...'
            : saveState === 'error'
              ? 'Could not save your profile. Check your connection and try again.'
              : 'Profile saved'

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
            <div className="ranking-status" role="status">
              <span className={'ranking-dot ranking-dot--' + (rankingStatus === 'hybrid' ? 'live' : 'local')} />
              {rankingLabel}
            </div>
          )}

          {hasProfile && (
            <div className="ranking-status" role="status">
              <span className={'ranking-dot ranking-dot--' + (canStore && saveState !== 'error' ? 'live' : 'local')} />
              {saveLabel}
            </div>
          )}

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

              {advanced?.meta && (
                <details className="retrieval-meta">
                  <summary>Technical retrieval details</summary>
                  <div className="retrieval-meta-grid">
                    <span>Lexical retrieval</span><strong>{advanced.meta.lexical_method}</strong>
                    <span>Rank fusion</span><strong>{advanced.meta.fusion_method}</strong>
                    <span>Semantic model</span><strong>{advanced.meta.semantic_model || 'local fallback'}</strong>
                    {advanced.meta.semantic_cache && (
                      <>
                        <span>Scholarship embedding cache</span><strong>{advanced.meta.semantic_cache}</strong>
                      </>
                    )}
                    {advanced.meta.semantic_error && (
                      <>
                        <span>Semantic fallback reason</span><strong>{advanced.meta.semantic_error}</strong>
                      </>
                    )}
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
