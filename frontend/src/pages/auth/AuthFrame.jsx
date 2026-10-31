import { CheckIcon } from '../../components/ui'

const PRODUCT_POINTS = [
  'Track every subscription and renewal',
  'Send invoices automatically on billing day',
  'See revenue and overdue payments at a glance',
]

// Layered card shared by the sign-in, reset and recovery screens
export default function AuthFrame({ badge, title, subtitle, highlighted = false, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight text-ink">Brightloop</p>
          <p className="mt-1 text-sm text-muted">Subscriptions, billing and revenue in one place</p>
        </div>

        <div className="rounded-3xl bg-card shadow-card">
          <div className="rounded-3xl bg-card p-2 shadow-float">
            <div
              className={`rounded-2xl px-6 pb-6 pt-5 transition-colors duration-300 motion-reduce:transition-none ${
                highlighted ? 'bg-pro' : 'bg-panel'
              }`}
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  highlighted ? 'bg-badge text-badge-ink' : 'bg-white text-ink'
                }`}
              >
                {badge}
              </span>
              <h1 className="mt-8 text-[2rem] font-bold leading-none tracking-tight text-ink">{title}</h1>
              <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
            </div>
            {children}
          </div>

          <ul className="space-y-3 px-6 pb-6 pt-5">
            {PRODUCT_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-ink">
                <CheckIcon active={false} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
