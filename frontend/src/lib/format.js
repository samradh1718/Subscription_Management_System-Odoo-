// Display in the tenant's zone (Asia/Kolkata for the demo tenant); the API sends UTC
const TIME_ZONE = 'Asia/Kolkata'

export function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: TIME_ZONE }).format(new Date(iso))
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(
    new Date(iso)
  )
}
