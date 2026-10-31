import { useState } from 'react'
import { Alert, Badge, Button, Card, PageHeader, SampleBadge, Table } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { inr, MY_INVOICES, MY_SUBSCRIPTION } from '../../lib/sampleData'

export default function MyBillingPage() {
  const [invoices, setInvoices] = useState(MY_INVOICES)
  const [paying, setPaying] = useState(null)
  const [notice, setNotice] = useState('')

  // Simulated payment only: no money moves and no card details are collected
  function pay(number) {
    setPaying(number)
    setTimeout(() => {
      setInvoices((list) => list.map((inv) => (inv.number === number ? { ...inv, status: 'Paid' } : inv)))
      setPaying(null)
      setNotice(`Simulated UPI payment received for ${number}. The invoice is now paid.`)
    }, 900)
  }

  const s = MY_SUBSCRIPTION
  return (
    <>
      <PageHeader title="My subscription" description="Your plan, renewals and invoices." actions={<SampleBadge />} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted">{s.number}</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{s.plan}</h2>
            <p className="mt-1 text-sm text-muted">{s.billing}</p>
          </div>
          <Badge tone="success">{s.status}</Badge>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Price</dt><dd className="mt-1 text-ink">{s.price}</dd></div>
          <div><dt className="text-muted">Customer since</dt><dd className="mt-1 text-ink">{formatDate(s.since)}</dd></div>
          <div><dt className="text-muted">Next invoice</dt><dd className="mt-1 text-ink">{formatDate(s.next)}</dd></div>
        </dl>
      </Card>

      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      <Card>
        <h2 className="mb-4 font-semibold text-ink">Invoices</h2>
        <Table columns={['Invoice', 'Billing period', 'Due', 'Total (incl. GST)', 'Status', '']}>
          {invoices.map((inv) => (
            <tr key={inv.number}>
              <td className="py-3 pr-4 font-mono text-xs">{inv.number}</td>
              <td className="py-3 pr-4">{inv.period}</td>
              <td className="py-3 pr-4 text-muted">{formatDate(inv.due)}</td>
              <td className="py-3 pr-4 tabular-nums">{inr(inv.total)}</td>
              <td className="py-3 pr-4"><Badge tone={inv.status === 'Paid' ? 'success' : 'accent'}>{inv.status}</Badge></td>
              <td className="py-3 text-right">
                {inv.status === 'Open' && (
                  <Button busy={paying === inv.number} onClick={() => pay(inv.number)}>Pay now (simulated)</Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
