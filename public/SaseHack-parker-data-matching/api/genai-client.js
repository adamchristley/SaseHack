import { GoogleGenAI } from '@google/genai'

const NETWORK_TIMEOUT_MS = 30000
const RETRY_DELAYS_MS = [0, 800, 1800]

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

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay) await sleep(delay)

    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isRetryableGeminiError(error) || attempt === RETRY_DELAYS_MS.length - 1) {
        throw error
      }
    }
  }

  throw lastError
}

export function friendlyGeminiError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Gemini request failed')
  const causeCode = error?.cause?.code

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
  const status = Number(error?.status || error?.statusCode || error?.code)

  if ([408, 429, 500, 502, 503, 504].includes(status)) return true

  return (
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'ETIMEDOUT' ||
    /fetch failed|connect timeout|headers timeout|socket hang up|temporarily unavailable/i.test(message)
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
