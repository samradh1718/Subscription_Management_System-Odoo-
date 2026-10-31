import { useState } from 'react'
import PasswordRules from '../../components/PasswordRules'
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader, Spinner, Table } from '../../components/ui'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'
import { useApi } from '../../lib/useApi'
import { EMAIL_PATTERN, isStrongPassword } from '../../lib/password'

const EMPTY = { full_name: '', email: '', password: '' }

function NewStaffForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (event) => {
    setForm((f) => ({ ...f, [event.target.name]: event.target.value }))
    setErrors((e) => ({ ...e, [event.target.name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    if (!form.full_name.trim()) found.full_name = 'Enter their full name.'
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = 'Enter a valid email address.'
    if (!isStrongPassword(form.password)) found.password = 'The password needs to meet all four rules.'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      await api('/users/staff', { method: 'POST', body: { ...form, full_name: form.full_name.trim(), email: form.email.trim() } })
      onCreated()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
      else if (error instanceof ApiError && error.code === 'email_taken') setErrors({ email: error.message })
      else setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="full_name" label="Full name" value={form.full_name} onChange={update} error={errors.full_name} />
        <Field id="email" label="Work email" type="email" value={form.email} onChange={update} error={errors.email} />
      </div>
      <Field id="password" label="Temporary password" type="password" autoComplete="new-password" value={form.password}
        onChange={update} error={errors.password} hint="Share it securely; they can reset it from the sign-in page." />
      <PasswordRules value={form.password} />
      {formError && <Alert>{formError}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" busy={saving}>Create staff account</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function StaffPage() {
  const { user: me } = useAuth()
  const admins = useApi('/users?role=admin')
  const staff = useApi('/users?role=staff')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const error = admins.error ?? staff.error
  const users = admins.data && staff.data ? [...admins.data, ...staff.data] : null
  const load = () => {
    admins.reload()
    staff.reload()
  }

  async function toggleActive(user) {
    setBusyId(user.id)
    setNotice(null)
    try {
      await api(`/users/${user.id}/${user.is_active ? 'deactivate' : 'activate'}`, { method: 'POST' })
      setNotice({ tone: 'success', text: `${user.full_name} is now ${user.is_active ? 'deactivated and signed out' : 'active'}.` })
      load()
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        description="Only administrators can create staff accounts. New accounts always get the staff role."
        actions={!creating && <Button onClick={() => setCreating(true)}>New staff account</Button>}
      />
      {creating && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-ink">New staff account</h2>
          <NewStaffForm
            onCancel={() => setCreating(false)}
            onCreated={() => {
              setCreating(false)
              setNotice({ tone: 'success', text: 'Staff account created.' })
              load()
            }}
          />
        </Card>
      )}
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      <Card>
        {error ? (
          <Alert onRetry={load}>{error.message}</Alert>
        ) : !users ? (
          <Spinner label="Loading team…" />
        ) : users.length === 0 ? (
          <EmptyState title="No team members yet" />
        ) : (
          <Table columns={['Name', 'Email', 'Role', 'Status', 'Last sign-in', '']}>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-3 pr-4 font-medium text-ink">{user.full_name}</td>
                <td className="py-3 pr-4 text-muted">{user.email}</td>
                <td className="py-3 pr-4"><Badge tone={user.roles.includes('admin') ? 'accent' : 'neutral'}>{user.roles.join(', ')}</Badge></td>
                <td className="py-3 pr-4">{user.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Deactivated</Badge>}</td>
                <td className="py-3 pr-4 text-muted">{formatDateTime(user.last_login_at)}</td>
                <td className="py-3 text-right">
                  {user.id !== me.id && (
                    <Button variant={user.is_active ? 'danger' : 'secondary'} busy={busyId === user.id} onClick={() => toggleActive(user)}>
                      {user.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  )
}
