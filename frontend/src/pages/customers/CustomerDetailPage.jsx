import CustomerForm from '../../components/CustomerForm'
import { Alert, Badge, Card, PageHeader, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import { Link } from '../../lib/router'
import { useCustomer } from '../../lib/useCustomer'

export default function CustomerDetailPage({ base, id }) {
  const { can } = useAuth()
  const { customer, error, reload, save } = useCustomer(`/customers/${encodeURIComponent(id)}`)

  if (error) {
    const missing = error.status === 404 || error.status === 422
    return (
      <div className="space-y-4">
        <Alert onRetry={missing ? undefined : reload}>
          {missing ? 'This customer does not exist or is not in your workspace.' : error.message}
        </Alert>
        <Link to={base} className="text-sm font-medium text-ink underline underline-offset-4">Back to customers</Link>
      </div>
    )
  }
  if (!customer) return <Spinner label="Loading customer…" />

  return (
    <>
      <Link to={base} className="text-sm text-muted hover:text-ink">← Customers</Link>
      <PageHeader
        title={customer.display_name}
        description={`Added ${formatDate(customer.created_at)}`}
        actions={customer.has_login ? <Badge tone="success">Has portal login</Badge> : <Badge tone="muted">No portal login</Badge>}
      />
      <Card>
        {can('customers.write') ? (
          <CustomerForm customer={customer} submitLabel="Save changes" onSubmit={save} />
        ) : (
          <p className="text-sm text-muted">You can view this customer but not edit it.</p>
        )}
      </Card>
    </>
  )
}
