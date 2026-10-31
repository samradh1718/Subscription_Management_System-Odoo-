import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { DEMO_MODE } from './demoApi'

const AuthContext = createContext(null)

// Where each role lands after signing in
export function homeFor(user) {
  if (!user) return '/login'
  if (user.roles.includes('admin')) return DEMO_MODE ? '/admin/overview' : '/admin/customers'
  if (user.roles.includes('staff')) return DEMO_MODE ? '/staff/subscriptions' : '/staff/customers'
  return DEMO_MODE ? '/portal/billing' : '/portal'
}

export function AuthProvider({ children }) {
  // status: 'loading' | 'anonymous' | 'authenticated' | 'offline'
  const [state, setState] = useState({ status: 'loading', user: null })

  // Resolves the current session; state is only set after the request settles
  const refresh = useCallback(
    () =>
      api('/auth/me').then(
        (user) => setState({ status: 'authenticated', user }),
        (error) => {
          if (error instanceof ApiError && error.status === 401) setState({ status: 'anonymous', user: null })
          else setState({ status: 'offline', user: null, error })
        }
      ),
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(() => {
    const signedIn = (result) => {
      setState({ status: 'authenticated', user: result.user })
      return result.user
    }
    return {
      ...state,
      refresh,
      can: (permission) => Boolean(state.user?.permissions.includes(permission)),
      login: async (email, password) => signedIn(await api('/auth/login', { method: 'POST', body: { email, password } })),
      register: async (fullName, email, password) =>
        signedIn(await api('/auth/register', { method: 'POST', body: { full_name: fullName, email, password } })),
      logout: async ({ everywhere = false } = {}) => {
        try {
          await api(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST' })
        } finally {
          setState({ status: 'anonymous', user: null })
        }
      },
    }
  }, [state, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
