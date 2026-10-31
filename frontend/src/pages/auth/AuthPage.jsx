import { useState } from 'react'
import PasswordRules from '../../components/PasswordRules'
import { Alert, Button, Field } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { DEMO_ACCOUNTS, DEMO_MODE } from '../../lib/demoApi'
import { EMAIL_PATTERN, isStrongPassword } from '../../lib/password'
import { Link, useRouter } from '../../lib/router'
import AuthFrame from './AuthFrame'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

// Only same-site paths are accepted as a post-login destination
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

export default function AuthPage({ mode }) {
  const { login, register } = useAuth()
  const { navigate, query } = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  function switchMode(nextMode) {
    const next = query.get('next')
    const path = nextMode === 'signup' ? '/register' : '/login'
    navigate(`${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true })
    setForm(EMPTY_FORM)
    setErrors({})
    setFormError('')
    setShowPassword(false)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setFormError('')
  }

  // Returns an object like { email: 'message' } for every invalid field
  function validate() {
    const found = {}
    if (isSignup && !form.name.trim()) found.name = 'Enter your full name.'
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = 'Enter a valid email address, like name@company.com.'
    if (isSignup) {
      if (!isStrongPassword(form.password)) found.password = 'Your password needs to meet all four rules below.'
      if (form.confirmPassword !== form.password) found.confirmPassword = 'Both passwords must match.'
    } else if (!form.password) {
      found.password = 'Enter your password.'
    }
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      const email = form.email.trim()
      const user = isSignup ? await register(form.name.trim(), email, form.password) : await login(email, form.password)
      navigate(safeNext(query.get('next')) ?? homeFor(user), { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const { full_name: name, ...rest } = error.fieldErrors
        setErrors({ ...rest, name })
      } else if (error instanceof ApiError && error.code === 'email_taken') {
        setErrors({ email: 'An account with this email already exists. Try signing in instead.' })
      } else {
        setFormError(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const showPasswordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((value) => !value)}
      className="rounded-md px-1.5 py-1 text-xs font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  )

  return (
    <AuthFrame
      highlighted={isSignup}
      badge={isSignup ? 'New here' : 'Welcome back'}
      title={isSignup ? 'Create account' : 'Sign in'}
      subtitle={isSignup ? 'Manage your subscriptions and invoices yourself.' : 'Continue to your subscriptions and invoices.'}
    >
      <div className="px-4 pt-5">
        <div className="grid grid-cols-2 rounded-full bg-page p-1" role="tablist" aria-label="Choose sign in or create account">
          {[
            { value: 'login', label: 'Sign in' },
            { value: 'signup', label: 'Create account' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={mode === tab.value}
              onClick={() => switchMode(tab.value)}
              className={`rounded-full py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-ink ${
                mode === tab.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-4 pb-4 pt-5">
        {isSignup && (
          <Field id="name" label="Full name" type="text" placeholder="Riya Sharma" autoComplete="name"
            value={form.name} onChange={updateField} error={errors.name} />
        )}

        <Field id="email" label="Email" type="email" placeholder="name@company.com" autoComplete="email"
          value={form.email} onChange={updateField} error={errors.email} />

        <Field
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder={isSignup ? 'Create a strong password' : 'Your password'}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={form.password}
          onChange={updateField}
          error={errors.password}
          rightSlot={showPasswordToggle}
        />

        {isSignup && <PasswordRules value={form.password} />}

        {isSignup && (
          <Field id="confirmPassword" label="Confirm password" type={showPassword ? 'text' : 'password'}
            placeholder="Type the password again" autoComplete="new-password"
            value={form.confirmPassword} onChange={updateField} error={errors.confirmPassword} />
        )}

        {!isSignup && (
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-ink"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" busy={submitting} className="w-full py-3">
          {isSignup ? 'Create account' : 'Sign in'}
        </Button>

        {formError && <Alert>{formError}</Alert>}

        {DEMO_MODE && !isSignup && (
          <div className="rounded-xl bg-page p-3">
            <p className="mb-2 text-xs font-semibold text-ink">Prototype demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => {
                    setForm({ ...EMPTY_FORM, email: account.email, password: account.password })
                    setErrors({})
                  }}
                  className="rounded-lg border border-line bg-white px-2 py-2 text-xs font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </AuthFrame>
  )
}
