import { useCallback, useEffect, useState } from 'react'
import { api, queryString } from './api'

// Loads a cursor-paginated endpoint ({ items, next_cursor }) with "load more"
export function useCursorList(path, params) {
  const url = `${path}${queryString(params)}`
  const [state, setState] = useState({ url: null, items: [], nextCursor: null, error: null, loadingMore: false })
  const [nonce, setNonce] = useState(0)

  const pageUrl = (cursor) => `${url}${url.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`

  // First page: state is only set after the request settles
  useEffect(() => {
    const controller = new AbortController()
    api(url, { signal: controller.signal }).then(
      (page) => setState({ url, items: page.items, nextCursor: page.next_cursor, error: null, loadingMore: false }),
      (error) => {
        if (error.name !== 'AbortError') setState({ url, items: [], nextCursor: null, error, loadingMore: false })
      }
    )
    return () => controller.abort()
  }, [url, nonce])

  async function loadMore() {
    setState((s) => ({ ...s, loadingMore: true, error: null }))
    try {
      const page = await api(pageUrl(state.nextCursor))
      setState((s) => ({ ...s, items: [...s.items, ...page.items], nextCursor: page.next_cursor, loadingMore: false }))
    } catch (error) {
      setState((s) => ({ ...s, error, loadingMore: false }))
    }
  }

  const current = state.url === url
  return {
    items: current ? state.items : [],
    nextCursor: current ? state.nextCursor : null,
    error: current ? state.error : null,
    loading: !current,
    loadingMore: state.loadingMore,
    loadMore,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  }
}
