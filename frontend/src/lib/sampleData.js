// PROTOTYPE SAMPLE DATA. Hardcoded figures that preview the billing and analytics screens
// before the billing engine (Phase 3) and analytics (Phase 5) exist. Shown only in demo mode.

export const KPIS = [
  { label: 'Monthly recurring revenue', value: '₹4,82,300', change: '+6.4% vs last month', good: true },
  { label: 'Annual recurring revenue', value: '₹57,87,600', change: 'MRR × 12', good: null },
  { label: 'Active subscriptions', value: '214', change: '+18 this month', good: true },
  { label: 'Collected this month', value: '₹3,96,150', change: '142 payments', good: null },
  { label: 'Outstanding receivables', value: '₹1,12,480', change: '31 open invoices', good: null },
  { label: 'Overdue invoices', value: '9', change: '₹38,900 overdue', good: false },
  { label: 'Customer churn (Oct)', value: '2.1%', change: '4 of 190 customers', good: false },
  { label: 'Failed payment rate', value: '3.8%', change: '-1.2 pts vs Sep', good: true },
]

export const MRR_TREND = [
  { month: 'May', value: 351000 },
  { month: 'Jun', value: 372400 },
  { month: 'Jul', value: 398900 },
  { month: 'Aug', value: 421300 },
  { month: 'Sep', value: 453200 },
  { month: 'Oct', value: 482300 },
]

export const REVENUE_BY_PLAN = [
  { plan: 'Business Suite — Monthly', value: 214500 },
  { plan: 'Business Suite — Yearly', value: 131200 },
  { plan: 'Starter — Monthly', value: 78400 },
  { plan: 'Enterprise — Quarterly', value: 58200 },
]

export const SUBSCRIPTIONS = [
  { number: 'SUB-000214', customer: 'Riya Sharma · Acme Retail', plan: 'Business Suite (Odoo) — Monthly', amount: 2560, status: 'Active', next: '2026-11-05' },
  { number: 'SUB-000213', customer: 'Kabir Singh · Northwind Logistics', plan: 'Enterprise — Quarterly', amount: 10500, status: 'Active', next: '2026-12-01' },
  { number: 'SUB-000209', customer: 'Ananya Iyer · Lotus Clinics', plan: 'Starter — Monthly', amount: 990, status: 'Past due', next: '2026-11-02' },
  { number: 'SUB-000204', customer: 'Rohan Das · PixelForge Studio', plan: 'Starter — Weekly', amount: 260, status: 'Paused', next: '—' },
  { number: 'SUB-000198', customer: 'Meera Joshi · Greenleaf Foods', plan: 'Business Suite — Yearly', amount: 22000, status: 'Active', next: '2027-03-14' },
  { number: 'SUB-000187', customer: 'Arjun Nair · Vertex Engineering', plan: 'Business Suite (Enterprise) — Monthly', amount: 3500, status: 'Cancellation scheduled', next: '2026-11-18' },
  { number: 'SUB-000171', customer: 'Sara Khan · BrightPath Tutors', plan: 'Starter — Monthly', amount: 990, status: 'Cancelled', next: '—' },
]

export const UPCOMING_RENEWALS = SUBSCRIPTIONS.filter((s) => s.next !== '—').sort((a, b) => a.next.localeCompare(b.next)).slice(0, 5)

export const OVERDUE = [
  { number: 'INV-2026-000412', customer: 'Lotus Clinics', due: '2026-10-12', days: 19, balance: 990 },
  { number: 'INV-2026-000398', customer: 'Harbor Cafe', due: '2026-10-05', days: 26, balance: 12400 },
  { number: 'INV-2026-000377', customer: 'Nimbus Labs', due: '2026-09-28', days: 33, balance: 25510 },
]

// The signed-in demo customer (Riya Sharma)
export const MY_SUBSCRIPTION = {
  number: 'SUB-000214',
  plan: 'Business Suite — Odoo variant',
  billing: 'Monthly, renews on the 5th',
  price: 'Base ₹2,000 + Odoo variant ₹560 = ₹2,560 / month + 18% GST',
  status: 'Active',
  since: '2026-05-05',
  next: '2026-11-05',
}

export const MY_INVOICES = [
  { number: 'INV-2026-000431', period: '5 Oct – 4 Nov 2026', due: '2026-11-04', total: 3020.8, status: 'Open' },
  { number: 'INV-2026-000356', period: '5 Sep – 4 Oct 2026', due: '2026-10-04', total: 3020.8, status: 'Paid' },
  { number: 'INV-2026-000287', period: '5 Aug – 4 Sep 2026', due: '2026-09-04', total: 3020.8, status: 'Paid' },
  { number: 'INV-2026-000219', period: '5 Jul – 4 Aug 2026', due: '2026-08-04', total: 3020.8, status: 'Paid' },
]

export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)
