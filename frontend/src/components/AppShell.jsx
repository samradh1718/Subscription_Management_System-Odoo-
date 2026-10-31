import { useState } from 'react'
import { homeFor, useAuth } from '../lib/auth'
import { DEMO_MODE, resetDemo } from '../lib/demoApi'
import { Link, Redirect, useRouter } from '../lib/router'
import { Alert, Badge, Button, Spinner } from './ui'

// Only links to pages that exist and that the role may open; preview pages exist in demo mode only
const NAV = {
  admin: [
    ...(DEMO_MODE ? [{ to: '/admin/overview', label: 'Overview' }, { to: '/admin/subscriptions', label: 'Subscriptions' }] : []),
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/staff', label: 'Staff' },
    { to: '/admin/audit', label: 'Audit log' },
  ],
  staff: [
    ...(DEMO_MODE ? [{ to: '/staff/subscriptions', label: 'Subscriptions' }] : []),
    { to: '/staff/customers', label: 'Customers' },
  ],
  customer: [
    ...(DEMO_MODE ? [{ to: '/portal/billing', label: 'My subscription' }] : []),
    { to: '/portal', label: 'My profile' },
  ],
}

function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs text-white">
      Prototype mode: sample data only, no real payments.{' '}
      <button
        type="button"
        className="font-medium underline underline-offset-2"
        onClick={() => {
          resetDemo()
          window.location.assign('/login')
        }}
      >
        Reset demo
      </button>
    </div>
  )
}

const AREA_LABEL = { admin: 'Admin console', staff: 'Staff workspace', customer: 'Customer portal' }

// Guards a section: signed-in user with the given role, otherwise redirect or explain
export function RequireRole({ role, children }) {
  const auth = useAuth()
  const { pathname, search } = useRouter()

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your workspace…" />
      </div>
    )
  }
  if (auth.status === 'offline') {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <Alert onRetry={auth.refresh}>{auth.error?.message ?? 'Cannot reach the server.'}</Alert>
      </div>
    )
  }
  if (auth.status === 'anonymous') {
    return <Redirect to={`/login?next=${encodeURIComponent(pathname + search)}`} />
  }
  if (!auth.user.roles.includes(role)) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
        <p className="text-lg font-semibold text-ink">You don't have access to this area.</p>
        <Link to={homeFor(auth.user)} className="text-sm font-medium text-ink underline underline-offset-4">
          Go to your workspace
        </Link>
      </div>
    )
  }
  return <AppShell role={role}>{children}</AppShell>
}

function AppShell({ role, children }) {
  const { user, logout } = useAuth()
  const { pathname, navigate } = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut(everywhere) {
    setSigningOut(true)
    try {
      await logout({ everywhere })
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={homeFor(user)} className="text-lg font-semibold tracking-tight text-ink">
              Brightloop
            </Link>
            <Badge tone="accent">{AREA_LABEL[role]}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{user.full_name}</span>
            <Button variant="ghost" disabled={signingOut} onClick={() => signOut(true)} title="Sign out on every device">
              Sign out everywhere
            </Button>
            <Button variant="secondary" busy={signingOut} onClick={() => signOut(false)}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Sections">
          {NAV[role].map((item) => {
            // '/portal' must not light up on '/portal/billing'
            const active = pathname === item.to || (item.to !== '/portal' && pathname.startsWith(`${item.to}/`))
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
