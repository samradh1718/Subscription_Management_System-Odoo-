import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

// GETs `path` and re-fetches when it changes or reload() is called.
// State is only set once the request settles, so effects never cascade renders.
export function useApi(path) {
  const [result, setResult] = useState({ path: null, data: null, error: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api(path, { signal: controller.signal }).then(
      (data) => setResult({ path, data, error: null }),
      (error) => {
        if (error.name !== 'AbortError') setResult({ path, data: null, error })
      }
    )
    return () => controller.abort()
  }, [path, nonce])

  const current = result.path === path
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    setData: useCallback((data) => setResult({ path, data, error: null }), [path]),
  }
}
