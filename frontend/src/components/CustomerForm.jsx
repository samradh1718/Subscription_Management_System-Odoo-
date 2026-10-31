import { useState } from 'react'
import { ApiError } from '../lib/api'
import { Alert, Button, Field } from './ui'

const SIZES = ['solo', '2-10', '11-50', '51-200', '201-1000', '1000+']
const EMPTY_ADDRESS = { line1: '', line2: '', city: '', state: '', postal_code: '', country: 'IN' }

function initialState(customer) {
  const billing = customer?.addresses?.find((a) => a.kind === 'billing') ?? {}
  return {
    display_name: customer?.display_name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    company: customer?.company ?? '',
    industry: customer?.industry ?? '',
    business_size: customer?.business_size ?? '',
    address: { ...EMPTY_ADDRESS, ...Object.fromEntries(Object.entries(billing).map(([k, v]) => [k, v ?? ''])) },
  }
}

const orNull = (value) => (value.trim() === '' ? null : value.trim())

// Create/edit form for a customer profile. `allowEmail` is false for the self-service portal.
export default function CustomerForm({ customer, allowEmail = true, submitLabel, onSubmit }) {
  const [form, setForm] = useState(() => initialState(customer))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const update = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
  }
  const updateAddress = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, address: { ...previous.address, [name.replace('address_', '')]: value } }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    if (!form.display_name.trim()) found.display_name = 'Enter a name.'
    if (allowEmail && !form.email.trim()) found.email = 'Enter an email address.'
    const a = form.address
    const hasAddress = [a.line1, a.line2, a.city, a.state, a.postal_code].some((v) => v.trim())
    if (hasAddress && !a.line1.trim()) found.address_line1 = 'Enter the first address line.'
    if (hasAddress && !a.city.trim()) found.address_city = 'Enter the city.'
    setErrors(found)
    if (Object.keys(found).length) return

    // PATCH replaces the address list, so keep the non-billing addresses untouched
    const others = (customer?.addresses ?? [])
      .filter((x) => x.kind !== 'billing')
      .map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'id')))
    const billing = hasAddress
      ? [{ kind: 'billing', is_default: true, line1: a.line1.trim(), line2: orNull(a.line2), city: a.city.trim(),
           state: orNull(a.state), postal_code: orNull(a.postal_code), country: a.country.trim().toUpperCase() || 'IN' }]
      : []

    const payload = {
      display_name: form.display_name.trim(),
      phone: orNull(form.phone),
      company: orNull(form.company),
      industry: orNull(form.industry),
      business_size: form.business_size || null,
      addresses: [...billing, ...others],
    }
    if (allowEmail) payload.email = form.email.trim()

    setSaving(true)
    setMessage(null)
    try {
      await onSubmit(payload)
      setMessage({ tone: 'success', text: 'Saved.' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setErrors(error.fieldErrors)
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="display_name" label="Name" value={form.display_name} onChange={update} error={errors.display_name} />
        <Field id="email" label="Email" type="email" value={form.email} onChange={update} error={errors.email}
          disabled={!allowEmail} hint={allowEmail ? undefined : 'Your sign-in email. Contact support to change it.'} />
        <Field id="phone" label="Phone" value={form.phone} onChange={update} error={errors.phone} autoComplete="tel" />
        <Field id="company" label="Company" value={form.company} onChange={update} error={errors.company} />
        <Field id="industry" label="Industry" value={form.industry} onChange={update} error={errors.industry} />
        <Field id="business_size" label="Business size" as="select" value={form.business_size} onChange={update}
          error={errors.business_size}>
          <option value="">Not specified</option>
          {SIZES.map((size) => (
            <option key={size} value={size}>{size === 'solo' ? 'Just me' : `${size} people`}</option>
          ))}
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Billing address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="address_line1" label="Address line 1" value={form.address.line1} onChange={updateAddress} error={errors.address_line1} />
          <Field id="address_line2" label="Address line 2 (optional)" value={form.address.line2} onChange={updateAddress} />
          <Field id="address_city" label="City" value={form.address.city} onChange={updateAddress} error={errors.address_city} />
          <Field id="address_state" label="State" value={form.address.state} onChange={updateAddress} />
          <Field id="address_postal_code" label="Postal code" value={form.address.postal_code} onChange={updateAddress} />
          <Field id="address_country" label="Country code" value={form.address.country} onChange={updateAddress} maxLength={2} hint="Two letters, e.g. IN" />
        </div>
      </fieldset>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Button type="submit" busy={saving}>{submitLabel}</Button>
    </form>
  )
}
