import { useState } from 'react'

// Password rule from the brief: more than 8 characters, one uppercase,
// one lowercase and one special character
const PASSWORD_RULES = [
  { label: 'More than 8 characters', test: (value) => value.length > 8 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'One special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PRODUCT_POINTS = [
  'Track every subscription and renewal',
  'Send invoices automatically on billing day',
  'See revenue and overdue payments at a glance',
]

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

// Small check mark, grey when inactive and dark when active
function CheckIcon({ active }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-ink' : 'text-icon'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

// Labelled input with an optional element on the right (e.g. Show/Hide)
function Field({ id, label, error, rightSlot, ...inputProps }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-4 focus:ring-ink/5 ${
            error ? 'border-red-400' : 'border-line'
          } ${rightSlot ? 'pr-16' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const isSignup = mode === 'signup'

  function switchMode(nextMode) {
    setMode(nextMode)
    setForm(EMPTY_FORM)
    setErrors({})
    setStatusMessage('')
    setShowPassword(false)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setStatusMessage('')
  }

  // Returns an object like { email: 'message' } for every invalid field
  function validate() {
    const found = {}

    if (isSignup && !form.name.trim()) {
      found.name = 'Enter your full name.'
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      found.email = 'Enter a valid email address, like name@company.com.'
    }
    if (isSignup) {
      if (!PASSWORD_RULES.every((rule) => rule.test(form.password))) {
        found.password = 'Your password needs to meet all four rules below.'
      }
      if (form.confirmPassword !== form.password) {
        found.confirmPassword = 'Both passwords must match.'
      }
    } else if (!form.password) {
      found.password = 'Enter your password.'
    }

    return found
  }

  function handleSubmit(event) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // TODO: replace this with the real API call once the backend is ready
    console.log(isSignup ? 'Sign up request' : 'Sign in request', form)
    setStatusMessage(
      isSignup
        ? 'Details look good. Account creation will work once the backend is connected.'
        : 'Details look good. Sign in will work once the backend is connected.'
    )
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight text-ink">Brightloop</p>
          <p className="mt-1 text-sm text-muted">Subscriptions, billing and revenue in one place</p>
        </div>

        {/* Outer card (same layered style as the pricing cards) */}
        <div className="rounded-3xl bg-card shadow-card">
          {/* Floating top card */}
          <div className="rounded-3xl bg-card p-2 shadow-float">
            {/* Header panel: neutral for sign in, gradient for sign up */}
            <div
              className={`rounded-2xl px-6 pb-6 pt-5 transition-colors duration-300 motion-reduce:transition-none ${
                isSignup ? 'bg-pro' : 'bg-panel'
              }`}
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  isSignup ? 'bg-badge text-badge-ink' : 'bg-white text-ink'
                }`}
              >
                {isSignup ? 'New here' : 'Welcome back'}
              </span>
              <h1 className="mt-8 text-[2rem] font-bold leading-none tracking-tight text-ink">
                {isSignup ? 'Create account' : 'Sign in'}
              </h1>
              <p className="mt-2 text-sm text-ink/70">
                {isSignup
                  ? 'Manage your subscriptions and invoices yourself.'
                  : 'Continue to your subscriptions and invoices.'}
              </p>
            </div>

            {/* Mode switch */}
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

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 px-4 pb-4 pt-5">
              {isSignup && (
                <Field
                  id="name"
                  label="Full name"
                  type="text"
                  placeholder="Riya Sharma"
                  autoComplete="name"
                  value={form.name}
                  onChange={updateField}
                  error={errors.name}
                />
              )}

              <Field
                id="email"
                label="Email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={form.email}
                onChange={updateField}
                error={errors.email}
              />

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

              {/* Live password rules (sign up only) */}
              {isSignup && (
                <ul className="grid grid-cols-1 gap-2 rounded-xl bg-page px-4 py-3 sm:grid-cols-2" aria-label="Password rules">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(form.password)
                    return (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-2 text-xs ${passed ? 'text-ink' : 'text-muted'}`}
                      >
                        <CheckIcon active={passed} />
                        {rule.label}
                      </li>
                    )
                  })}
                </ul>
              )}

              {isSignup && (
                <Field
                  id="confirmPassword"
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Type the password again"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  error={errors.confirmPassword}
                />
              )}

              {!isSignup && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="btn-glossy w-full rounded-full py-3 text-sm font-medium text-white transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.99]"
              >
                {isSignup ? 'Create account' : 'Sign in'}
              </button>

              {statusMessage && (
                <p className="rounded-xl bg-badge px-4 py-3 text-sm text-badge-ink" role="status">
                  {statusMessage}
                </p>
              )}
            </form>
          </div>

          {/* Bottom section, like the feature list on the pricing cards */}
          <ul className="space-y-3 px-6 pb-6 pt-5">
            {PRODUCT_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-ink">
                <CheckIcon active={false} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}