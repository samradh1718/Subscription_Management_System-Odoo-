import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Minimal History-API router: enough for this app until React Router can be installed
const RouterContext = createContext(null)

function currentLocation() {
  return { pathname: window.location.pathname, search: window.location.search }
}

export function Router({ children }) {
  const [location, setLocation] = useState(currentLocation)

  useEffect(() => {
    const onPop = () => setLocation(currentLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) window.history.replaceState(null, '', to)
    else window.history.pushState(null, '', to)
    setLocation(currentLocation())
    window.scrollTo(0, 0)
  }, [])

  const value = useMemo(
    () => ({ ...location, query: new URLSearchParams(location.search), navigate }),
    [location, navigate]
  )
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter() {
  return useContext(RouterContext)
}

// matchPath('/admin/customers/:id', '/admin/customers/42') -> { id: '42' }
export function matchPath(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(':')) params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
    else if (patternParts[i] !== pathParts[i]) return null
  }
  return params
}

export function Link({ to, onClick, children, ...props }) {
  const { navigate } = useRouter()

  function handleClick(event) {
    onClick?.(event)
    // Let the browser handle new-tab clicks
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

export function Redirect({ to }) {
  const { navigate } = useRouter()
  useEffect(() => navigate(to, { replace: true }), [navigate, to])
  return null
}
