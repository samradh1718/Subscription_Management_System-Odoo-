import { useState } from 'react'
import { Alert, Button, Field } from '../../components/ui'
import { api } from '../../lib/api'
import { EMAIL_PATTERN } from '../../lib/password'
import { Link } from '../../lib/router'
import AuthFrame from './AuthFrame'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address, like name@company.com.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // The API answers the same way whether or not the account exists
      const result = await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } })
      setSentMessage(result.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame badge="Account recovery" title="Reset password" subtitle="We'll email you a link to choose a new password.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-4 pb-4 pt-5">
        {sentMessage ? (
          <Alert tone="info">{sentMessage} The link works for 30 minutes.</Alert>
        ) : (
          <>
            <Field id="email" label="Email" type="email" placeholder="name@company.com" autoComplete="email"
              value={email} error={error}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
            />
            <Button type="submit" busy={submitting} className="w-full py-3">
              Send reset link
            </Button>
          </>
        )}
        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
