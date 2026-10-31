import { useState } from 'react'
import { Badge, Card, PageHeader, SampleBadge, Table } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { inr, SUBSCRIPTIONS } from '../../lib/sampleData'

const STATUS_TONE = { Active: 'success', 'Past due': 'neutral', Paused: 'muted', 'Cancellation scheduled': 'accent', Cancelled: 'muted' }
const FILTERS = ['All', ...Object.keys(STATUS_TONE)]

export default function SubscriptionsPage() {
  const [filter, setFilter] = useState('All')
  const rows = SUBSCRIPTIONS.filter((s) => filter === 'All' || s.status === filter)

  return (
    <>
      <PageHeader title="Subscriptions" description="Every contract, its plan and when it bills next." actions={<SampleBadge />} />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-ink text-white' : 'bg-page text-muted hover:text-ink'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Table columns={['Number', 'Customer', 'Plan', 'Amount', 'Status', 'Next billing']}>
          {rows.map((s) => (
            <tr key={s.number}>
              <td className="py-3 pr-4 font-mono text-xs">{s.number}</td>
              <td className="py-3 pr-4">{s.customer}</td>
              <td className="py-3 pr-4 text-muted">{s.plan}</td>
              <td className="py-3 pr-4 tabular-nums">{inr(s.amount)}</td>
              <td className="py-3 pr-4"><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
              <td className="py-3 pr-4 text-muted">{s.next === '—' ? '—' : formatDate(s.next)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
