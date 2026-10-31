import CustomerForm from '../../components/CustomerForm'
import { Alert, Card, PageHeader, Spinner } from '../../components/ui'
import { useCustomer } from '../../lib/useCustomer'

export default function ProfilePage() {
  const { customer, error, reload, save } = useCustomer('/customers/me')

  return (
    <>
      <PageHeader title="My profile" description="Your contact and billing details. Invoices use the billing address below." />
      {error ? (
        <Alert onRetry={reload}>{error.message}</Alert>
      ) : !customer ? (
        <Spinner label="Loading your profile…" />
      ) : (
        <Card>
          <CustomerForm customer={customer} allowEmail={false} submitLabel="Save changes" onSubmit={save} />
        </Card>
      )}
    </>
  )
}
