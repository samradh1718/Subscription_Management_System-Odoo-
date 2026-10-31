// Thin client for the Brightloop API (/api/v1). The dev server and nginx proxy /api to
// FastAPI, so requests are same-origin and the session cookie is sent automatically.

import { DEMO_MODE, DemoError, demoFetch } from './demoApi'

const CSRF_COOKIE = 'bl_csrf'

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  // Validation errors as { fieldName: 'message' } for forms
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {}
    return Object.fromEntries(
      this.details.filter((d) => d.field).map((d) => [d.field.split('.')[0], d.message.replace(/^Value error, /, '')])
    )
  }
}

function readCookie(name) {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  if (DEMO_MODE) {
    try {
      return await demoFetch(method, path, body)
    } catch (error) {
      throw error instanceof DemoError ? new ApiError(error.status, error.code, error.message, error.details) : error
    }
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  let response
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'network', 'Cannot reach the Brightloop server. Check that the backend is running.')
  }

  // The dev proxy / nginx answers 502-504 when FastAPI is down
  if ([502, 503, 504].includes(response.status) && !response.headers.get('content-type')?.includes('json')) {
    throw new ApiError(0, 'network', 'Cannot reach the Brightloop server. Check that the backend is running.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const err = data?.error ?? {}
    throw new ApiError(response.status, err.code ?? 'http_error', err.message ?? `Request failed (${response.status}).`, err.details)
  }
  return data
}

export function queryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
