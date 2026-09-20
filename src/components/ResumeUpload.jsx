import { useRef, useState } from 'react'
import { analyzeResumeText, extractResumeText } from '../lib/resumeExtractor.js'
import { analyzeResumeWithAI } from '../lib/aiResumeExtractor.js'

export default function ResumeUpload({ onProfile }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [fileName, setFileName] = useState('')
  const [diagnostics, setDiagnostics] = useState(null)
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setStatus('reading')
    setFileName(file.name)
    setDiagnostics(null)
    setError('')

    try {
      const text = await extractResumeText(file)

      // Always produce a local fallback first. If the server-side Gemini
      // endpoint is configured, replace it with evidence-verified AI extraction.
      const local = analyzeResumeText(text)
      let result = local

      try {
        setStatus('analyzing')
        result = await analyzeResumeWithAI(text)
      } catch {
        result = {
          ...local,
          diagnostics: {
            ...local.diagnostics,
            source: 'local-fallback',
          },
        }
      }

      onProfile(result.profile)
      setDiagnostics(result.diagnostics)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that resume.')
      setStatus('error')
    }
  }

  const sourceLabel = diagnostics?.source === 'gemini'
    ? `Gemini extraction · ${diagnostics.model}`
    : diagnostics?.source === 'local-fallback'
      ? 'Local fallback extraction'
      : null

  return (
    <div className="panel resume-upload">
      <p className="eyebrow">Fast profile setup</p>
      <h2 className="panel-title">Upload your resume</h2>
      <p className="panel-hint">
        We extract scholarship-relevant facts, verify supporting evidence, then
        fill the editable profile below.
      </p>

      <input
        ref={inputRef}
        className="resume-file-input"
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        className="btn btn--gold resume-upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'reading' || status === 'analyzing'}
      >
        {status === 'reading'
          ? 'Reading resume...'
          : status === 'analyzing'
            ? 'Analyzing with AI...'
            : 'Choose resume'}
      </button>

      {fileName && <p className="resume-file-name">{fileName}</p>}

      {status === 'done' && diagnostics && (
        <div className="resume-result" role="status">
          <strong>Profile filled.</strong>
          {sourceLabel && <span>{sourceLabel}</span>}
          <span>{diagnostics.fields_found.length} profile fields detected.</span>
          {diagnostics.evidence_verified != null && (
            <span>{diagnostics.evidence_verified} extracted facts passed evidence verification.</span>
          )}
          {diagnostics.rejected_claims?.length > 0 && (
            <span>{diagnostics.rejected_claims.length} unsupported AI claim(s) were rejected.</span>
          )}
          {diagnostics.missing_fields.length > 0 && (
            <span>Still check: {diagnostics.missing_fields.join(', ')}.</span>
          )}
        </div>
      )}

      {status === 'error' && <p className="resume-error" role="alert">{error}</p>}

      <p className="resume-privacy">
        When AI extraction is configured, resume text is sent to Gemini for analysis.
        This app does not persist the resume.
      </p>
    </div>
  )
}
