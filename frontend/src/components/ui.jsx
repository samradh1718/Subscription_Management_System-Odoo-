// Shared building blocks, styled with the tokens in index.css

export function CheckIcon({ active }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-ink' : 'text-icon'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export function Button({ variant = 'primary', busy = false, className = '', children, disabled, ...props }) {
  const styles = {
    primary: 'btn-glossy text-white hover:brightness-125',
    secondary: 'border border-line bg-white text-ink hover:bg-page',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
    ghost: 'text-muted hover:text-ink hover:bg-page',
  }
  return (
    <button
      disabled={disabled || busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS} ${styles[variant]} ${className}`}
      {...props}
    >
      {busy && <Spinner small />}
      {children}
    </button>
  )
}

// Labelled input with an optional element on the right (e.g. Show/Hide)
export function Field({ id, label, error, hint, rightSlot, as = 'input', children, ...inputProps }) {
  const Control = as
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <Control
          id={id}
          name={id}
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-4 focus:ring-ink/5 disabled:bg-page disabled:text-muted ${
            error ? 'border-red-400' : 'border-line'
          } ${rightSlot ? 'pr-16' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...inputProps}
        >
          {children}
        </Control>
        {rightSlot && <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Spinner({ small = false, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role={label ? 'status' : undefined}>
      <span
        className={`${small ? 'h-3.5 w-3.5' : 'h-5 w-5'} animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none`}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

export function Alert({ tone = 'error', children, onRetry }) {
  const styles = {
    error: 'bg-red-50 text-red-800',
    success: 'bg-emerald-50 text-emerald-800',
    info: 'bg-badge text-badge-ink',
  }
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm ${styles[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p>{children}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`shrink-0 font-medium underline underline-offset-4 ${FOCUS}`}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Card({ className = '', children }) {
  return <section className={`rounded-2xl bg-card p-5 shadow-card ${className}`}>{children}</section>
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const styles = {
    neutral: 'bg-panel text-ink',
    accent: 'bg-badge text-badge-ink',
    success: 'bg-emerald-50 text-emerald-800',
    muted: 'bg-page text-muted',
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[tone]}`}>{children}</span>
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  )
}

// Horizontal scroll container so wide tables never push the page sideways
export function Table({ columns, children }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            {columns.map((column) => (
              <th key={column} scope="col" className="py-2 pr-4 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

// Marks hardcoded prototype figures so they are never mistaken for live data
export function SampleBadge() {
  return <Badge tone="accent">Sample data</Badge>
}
