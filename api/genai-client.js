import { GoogleGenAI } from '@google/genai'

const NETWORK_TIMEOUT_MS = 30000
const FALLBACK_RETRY_DELAYS_MS = [800, 1800]

export function createGenAI(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: NETWORK_TIMEOUT_MS,
    },
  })
}

export async function withGeminiRetry(operation) {
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isRetryableGeminiError(error) || attempt === 2) {
        throw error
      }

      const retryDelay = retryDelayMs(error)
      const fallbackDelay = FALLBACK_RETRY_DELAYS_MS[Math.min(attempt, FALLBACK_RETRY_DELAYS_MS.length - 1)]
      await sleep(retryDelay ?? fallbackDelay)
    }
  }

  throw lastError
}

export function friendlyGeminiError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Gemini request failed')
  const causeCode = error?.cause?.code
  const retryDelay = retryDelayMs(error)

  if (isQuotaError(error)) {
    const suffix = retryDelay ? ` Retry after about ${Math.ceil(retryDelay / 1000)} seconds.` : ''
    return `Gemini embedding quota is temporarily exhausted.${suffix}`
  }

  if (
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
    /fetch failed|connect timeout|timed out/i.test(message)
  ) {
    return 'Could not reach Google Gemini after 3 attempts. Check internet/VPN/firewall access to generativelanguage.googleapis.com and retry.'
  }

  return message
}

function isRetryableGeminiError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  const causeCode = error?.cause?.code
  const status = numericStatus(error)

  if ([408, 429, 500, 502, 503, 504].includes(status)) return true

  return (
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'ETIMEDOUT' ||
    /fetch failed|connect timeout|headers timeout|socket hang up|temporarily unavailable|resource_exhausted/i.test(message)
  )
}

function isQuotaError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  return numericStatus(error) === 429 || /quota exceeded|resource_exhausted/i.test(message)
}

function numericStatus(error) {
  const direct = Number(error?.status || error?.statusCode || error?.code)
  if (Number.isFinite(direct)) return direct

  const message = error instanceof Error ? error.message : String(error || '')
  const match = message.match(/"code"\s*:\s*(\d{3})/)
  return match ? Number(match[1]) : NaN
}

function retryDelayMs(error) {
  const message = error instanceof Error ? error.message : String(error || '')

  const retryInfo = message.match(/"retryDelay"\s*:\s*"([0-9.]+)s"/i)
  if (retryInfo) return Math.ceil(Number(retryInfo[1]) * 1000) + 750

  const prose = message.match(/retry in\s+([0-9.]+)s/i)
  if (prose) return Math.ceil(Number(prose[1]) * 1000) + 750

  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
