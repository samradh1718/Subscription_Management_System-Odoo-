import { RequireRole } from './components/AppShell'
import { Spinner } from './components/ui'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import { Link, matchPath, Redirect, Router, useRouter } from './lib/router'
import AuditPage from './pages/admin/AuditPage'
import StaffPage from './pages/admin/StaffPage'
import AuthPage from './pages/auth/AuthPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import CustomerDetailPage from './pages/customers/CustomerDetailPage'
import CustomersPage from './pages/customers/CustomersPage'
import ProfilePage from './pages/portal/ProfilePage'
import { DEMO_MODE } from './lib/demoApi'
import MyBillingPage from './pages/preview/MyBillingPage'
import OverviewPage from './pages/preview/OverviewPage'
import SubscriptionsPage from './pages/preview/SubscriptionsPage'

const ROUTES = [
  { path: '/', render: () => <Home /> },
  { path: '/login', render: () => <AuthPage mode="login" /> },
  { path: '/register', render: () => <AuthPage mode="signup" /> },
  { path: '/forgot-password', render: () => <ForgotPasswordPage /> },
  { path: '/reset-password', render: () => <ResetPasswordPage /> },

  { path: '/admin', render: () => <Redirect to="/admin/customers" /> },
  { path: '/admin/customers', role: 'admin', render: () => <CustomersPage base="/admin/customers" /> },
  { path: '/admin/customers/:id', role: 'admin', render: ({ id }) => <CustomerDetailPage key={id} base="/admin/customers" id={id} /> },
  { path: '/admin/staff', role: 'admin', render: () => <StaffPage /> },
  { path: '/admin/audit', role: 'admin', render: () => <AuditPage /> },

  { path: '/staff', render: () => <Redirect to="/staff/customers" /> },
  { path: '/staff/customers', role: 'staff', render: () => <CustomersPage base="/staff/customers" /> },
  { path: '/staff/customers/:id', role: 'staff', render: ({ id }) => <CustomerDetailPage key={id} base="/staff/customers" id={id} /> },

  { path: '/portal', role: 'customer', render: () => <ProfilePage /> },

  // Prototype previews with hardcoded sample data (demo mode only)
  ...(DEMO_MODE
    ? [
        { path: '/admin/overview', role: 'admin', render: () => <OverviewPage /> },
        { path: '/admin/subscriptions', role: 'admin', render: () => <SubscriptionsPage /> },
        { path: '/staff/subscriptions', role: 'staff', render: () => <SubscriptionsPage /> },
        { path: '/portal/billing', role: 'customer', render: () => <MyBillingPage /> },
      ]
    : []),
]

// Signed-in users go to their workspace, everyone else to sign in
function Home() {
  const { status, user } = useAuth()
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center"><Spinner label="Loading…" /></div>
  return <Redirect to={status === 'authenticated' ? homeFor(user) : '/login'} />
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
      <p className="text-lg font-semibold text-ink">Page not found</p>
      <Link to="/" className="text-sm font-medium text-ink underline underline-offset-4">Go home</Link>
    </div>
  )
}

function Routes() {
  const { pathname } = useRouter()
  for (const route of ROUTES) {
    const params = matchPath(route.path, pathname)
    if (!params) continue
    const page = route.render(params)
    return route.role ? <RequireRole role={route.role}>{page}</RequireRole> : page
  }
  return <NotFound />
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </Router>
  )
}
