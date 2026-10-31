import { useState } from 'react'
import PasswordRules from '../../components/PasswordRules'
import { Alert, Button, Field } from '../../components/ui'
import { api, ApiError } from '../../lib/api'
import { isStrongPassword } from '../../lib/password'
import { Link, useRouter } from '../../lib/router'
import AuthFrame from './AuthFrame'

export default function ResetPasswordPage() {
  const { query } = useRouter()
  const token = query.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    if (!isStrongPassword(password)) found.password = 'Your password needs to meet all four rules below.'
    if (confirm !== password) found.confirm = 'Both passwords must match.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } })
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.fieldErrors.password) {
        setErrors({ password: error.fieldErrors.password })
      } else {
        setFormError(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame badge="Account recovery" title="New password" subtitle="Choose a new password for your account.">
      <div className="space-y-4 px-4 pb-4 pt-5">
        {done ? (
          <>
            <Alert tone="success">Password updated. You've been signed out everywhere; sign in with your new password.</Alert>
            <Link to="/login" className="btn-glossy block rounded-full py-3 text-center text-sm font-medium text-white">
              Go to sign in
            </Link>
          </>
        ) : token.length < 20 ? (
          <>
            <Alert>This reset link is incomplete. Open the link from your email again, or request a new one.</Alert>
            <Link to="/forgot-password" className="block text-center text-sm font-medium text-ink underline-offset-4 hover:underline">
              Request a new link
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field id="password" label="New password" type="password" autoComplete="new-password"
              value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} />
            <PasswordRules value={password} />
            <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password"
              value={confirm} onChange={(event) => setConfirm(event.target.value)} error={errors.confirm} />
            <Button type="submit" busy={submitting} className="w-full py-3">
              Update password
            </Button>
            {formError && <Alert>{formError}</Alert>}
          </form>
        )}
      </div>
    </AuthFrame>
  )
}
