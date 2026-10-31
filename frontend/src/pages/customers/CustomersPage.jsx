import { useEffect, useState } from 'react'
import CustomerForm from '../../components/CustomerForm'
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader, Spinner, Table } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import { Link, useRouter } from '../../lib/router'
import { useCursorList } from '../../lib/useCursorList'

// Shared by admin (/admin/customers) and staff (/staff/customers); `base` is the section path
export default function CustomersPage({ base }) {
  const { can } = useAuth()
  const { navigate } = useRouter()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const list = useCursorList('/customers', { q: query, limit: 25 })

  // Debounce typing so we query once the user pauses
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  async function createCustomer(payload) {
    const customer = await api('/customers', { method: 'POST', body: payload })
    navigate(`${base}/${customer.id}`)
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every business customer, whether or not they have a portal login."
        actions={can('customers.write') && !creating && <Button onClick={() => setCreating(true)}>New customer</Button>}
      />

      {creating && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">New customer</h2>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
          <CustomerForm submitLabel="Create customer" onSubmit={createCustomer} />
        </Card>
      )}

      <Card>
        <div className="mb-4 max-w-sm">
          <Field id="search" label="Search" type="search" placeholder="Name, email or company"
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {list.loading ? (
          <Spinner label="Loading customers…" />
        ) : list.error && list.items.length === 0 ? (
          <Alert onRetry={list.reload}>{list.error.message}</Alert>
        ) : list.items.length === 0 ? (
          <EmptyState title={query ? 'No customers match your search' : 'No customers yet'}>
            {query ? 'Try a different name, email or company.' : 'Customers appear here when they sign up or when you add one.'}
          </EmptyState>
        ) : (
          <>
            <Table columns={['Name', 'Email', 'Company', 'Portal login', 'Added']}>
              {list.items.map((customer) => (
                <tr key={customer.id}>
                  <td className="py-3 pr-4">
                    <Link to={`${base}/${customer.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                      {customer.display_name}
                    </Link>
                    {customer.is_demo && <span className="ml-2"><Badge tone="muted">Demo</Badge></span>}
                  </td>
                  <td className="py-3 pr-4 text-muted">{customer.email}</td>
                  <td className="py-3 pr-4 text-muted">{customer.company ?? '—'}</td>
                  <td className="py-3 pr-4">
                    {customer.has_login ? <Badge tone="success">Yes</Badge> : <Badge tone="muted">No</Badge>}
                  </td>
                  <td className="py-3 pr-4 text-muted">{formatDate(customer.created_at)}</td>
                </tr>
              ))}
            </Table>
            {list.error && list.items.length > 0 && <div className="mt-4"><Alert onRetry={list.loadMore}>{list.error.message}</Alert></div>}
            {list.nextCursor && (
              <div className="mt-4 text-center">
                <Button variant="secondary" busy={list.loadingMore} onClick={list.loadMore}>Load more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
