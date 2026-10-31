import { Badge, Card, PageHeader, SampleBadge, Table } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { inr, KPIS, MRR_TREND, OVERDUE, REVENUE_BY_PLAN, UPCOMING_RENEWALS } from '../../lib/sampleData'

function Bars({ rows, labelKey }) {
  const max = Math.max(...rows.map((r) => r.value))
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row[labelKey]}>
          <div className="mb-1 flex justify-between gap-4 text-sm">
            <span className="text-ink">{row[labelKey]}</span>
            <span className="tabular-nums text-muted">{inr(row.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-page">
            <div className="h-2.5 rounded-full bg-ink" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Business overview" description="Revenue, collections and risk for Brightloop Software." actions={<SampleBadge />} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-xs font-medium text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{kpi.value}</p>
            <p className={`mt-1 text-xs ${kpi.good === true ? 'text-emerald-700' : kpi.good === false ? 'text-red-700' : 'text-muted'}`}>
              {kpi.change}
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-ink">MRR trend</h2>
          <Bars rows={MRR_TREND} labelKey="month" />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">MRR by plan</h2>
          <Bars rows={REVENUE_BY_PLAN} labelKey="plan" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Upcoming renewals</h2>
          <Table columns={['Subscription', 'Customer', 'Renews', 'Amount']}>
            {UPCOMING_RENEWALS.map((s) => (
              <tr key={s.number}>
                <td className="py-3 pr-4 font-mono text-xs">{s.number}</td>
                <td className="py-3 pr-4">{s.customer.split(' · ')[1]}</td>
                <td className="py-3 pr-4 text-muted">{formatDate(s.next)}</td>
                <td className="py-3 pr-4 tabular-nums">{inr(s.amount)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Overdue invoices</h2>
          <Table columns={['Invoice', 'Customer', 'Days overdue', 'Balance']}>
            {OVERDUE.map((inv) => (
              <tr key={inv.number}>
                <td className="py-3 pr-4 font-mono text-xs">{inv.number}</td>
                <td className="py-3 pr-4">{inv.customer}</td>
                <td className="py-3 pr-4"><Badge tone={inv.days > 30 ? 'neutral' : 'muted'}>{inv.days} days</Badge></td>
                <td className="py-3 pr-4 tabular-nums">{inr(inv.balance)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
