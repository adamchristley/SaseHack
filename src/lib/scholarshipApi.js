/*
 * Client wrapper for the live national scholarship proxy (/api/scholarships).
 * Times out and can be aborted, so a slow API never freezes the UI. Callers
 * treat any throw as "fall back to the curated set".
 */
export async function searchNational(q, { limit = 50, timeoutMs = 6000, signal } = {}) {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) signal.addEventListener('abort', onAbort)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = `/api/scholarships?q=${encodeURIComponent(q)}&limit=${limit}`
    const res = await fetch(url, { signal: controller.signal })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || `API ${res.status}`)
    if (!data || !Array.isArray(data.scholarships)) throw new Error('bad payload')
    return data // { source, fetched_at, count, scholarships }
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}
