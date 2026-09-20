import { useRef, useState } from 'react'
import { analyzeResumeText, extractResumeText } from '../lib/resumeExtractor.js'

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
      const result = analyzeResumeText(text)
      onProfile(result.profile)
      setDiagnostics(result.diagnostics)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that resume.')
      setStatus('error')
    }
  }

  return (
    <div className="panel resume-upload">
      <p className="eyebrow">Fast profile setup</p>
      <h2 className="panel-title">Upload your resume</h2>
      <p className="panel-hint">
        We extract scholarship-relevant facts from your resume and fill the profile below.
        Review anything we found before trusting a match.
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
        disabled={status === 'reading'}
      >
        {status === 'reading' ? 'Reading resume...' : 'Choose resume'}
      </button>

      {fileName && <p className="resume-file-name">{fileName}</p>}

      {status === 'done' && diagnostics && (
        <div className="resume-result" role="status">
          <strong>Profile filled.</strong>
          <span>{diagnostics.fields_found.length} profile fields detected.</span>
          {diagnostics.missing_fields.length > 0 && (
            <span>Still check: {diagnostics.missing_fields.join(', ')}.</span>
          )}
        </div>
      )}

      {status === 'error' && <p className="resume-error" role="alert">{error}</p>}

      <p className="resume-privacy">
        Your resume is processed in the browser for this MVP and is not stored.
      </p>
    </div>
  )
}
