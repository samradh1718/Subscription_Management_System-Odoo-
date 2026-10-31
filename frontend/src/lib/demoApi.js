// PROTOTYPE MODE ONLY (npm run demo). An in-browser stand-in for the FastAPI backend with
// hardcoded sample data, so the UI can be presented without a server. Never used in a normal build.

export const DEMO_MODE = import.meta.env.VITE_DEMO === 'true'

export const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@brightloop.demo', password: 'Admin@12345' },
  { role: 'Staff', email: 'staff@brightloop.demo', password: 'Staff@12345' },
  { role: 'Customer', email: 'riya@acme.demo', password: 'Customer@123' },
]

const PERMS = {
  admin: ['audit.read', 'customers.read', 'customers.write', 'users.create_staff', 'users.manage', 'users.read'],
  staff: ['customers.read', 'customers.write'],
  customer: ['portal.access'],
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()
let counter = 100
const newId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`

function seed() {
  const users = [
    { id: newId(), email: 'admin@brightloop.demo', full_name: 'Aarav Mehta', password: 'Admin@12345', roles: ['admin'], is_active: true, last_login_at: daysAgo(0), created_at: daysAgo(120) },
    { id: newId(), email: 'staff@brightloop.demo', full_name: 'Neha Kapoor', password: 'Staff@12345', roles: ['staff'], is_active: true, last_login_at: daysAgo(1), created_at: daysAgo(90) },
    { id: newId(), email: 'vikram@brightloop.demo', full_name: 'Vikram Rao', password: 'Staff@12345', roles: ['staff'], is_active: false, last_login_at: daysAgo(40), created_at: daysAgo(80) },
    { id: newId(), email: 'riya@acme.demo', full_name: 'Riya Sharma', password: 'Customer@123', roles: ['customer'], is_active: true, last_login_at: daysAgo(2), created_at: daysAgo(60) },
  ]
  const companies = [
    ['Riya Sharma', 'riya@acme.demo', 'Acme Retail', 'Retail', '11-50', users[3].id],
    ['Kabir Singh', 'kabir@northwind.demo', 'Northwind Logistics', 'Logistics', '51-200', null],
    ['Ananya Iyer', 'ananya@lotus.demo', 'Lotus Clinics', 'Healthcare', '2-10', null],
    ['Rohan Das', 'rohan@pixelforge.demo', 'PixelForge Studio', 'Media', 'solo', null],
    ['Meera Joshi', 'meera@greenleaf.demo', 'Greenleaf Foods', 'Food & beverage', '201-1000', null],
    ['Arjun Nair', 'arjun@vertex.demo', 'Vertex Engineering', 'Manufacturing', '51-200', null],
    ['Sara Khan', 'sara@brightpath.demo', 'BrightPath Tutors', 'Education', '11-50', null],
  ]
  const customers = companies.map(([name, email, company, industry, size, userId], i) => ({
    id: newId(), display_name: name, email, company, industry, business_size: size, phone: `+91 98${String(10000000 + i * 1234567).slice(0, 8)}`,
    user_id: userId, has_login: Boolean(userId), is_demo: true, created_at: daysAgo(60 - i * 7),
    addresses: i === 0 ? [{ id: newId(), kind: 'billing', line1: '12 MG Road', line2: null, city: 'Bengaluru', state: 'Karnataka', postal_code: '560001', country: 'IN', is_default: true }] : [],
  }))
  const audit = [
    ['auth.login', 'user', users[0].id, users[0].id, {}, 0],
    ['users.deactivate', 'user', users[2].id, users[0].id, {}, 3],
    ['customers.update', 'customer', customers[1].id, users[1].id, { fields: ['phone'] }, 5],
    ['users.create_staff', 'user', users[1].id, users[0].id, { email: users[1].email }, 90],
  ].map(([action, entity_type, entity_id, actor_user_id, data, ago]) => ({ id: newId(), action, entity_type, entity_id, actor_user_id, data, created_at: daysAgo(ago) }))
  return { users, customers, audit, sessionUserId: null }
}

const KEY = 'brightloop-demo-state'
function load() {
  try {
    const saved = sessionStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* storage unavailable: start fresh */ }
  return seed()
}
let db = load()
function persist() {
  try { sessionStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

class DemoError extends Error {
  constructor(status, code, message, details) {
    super(message)
    Object.assign(this, { status, code, details })
  }
}

const me = () => db.users.find((u) => u.id === db.sessionUserId && u.is_active)
function principal() {
  const user = me()
  if (!user) throw new DemoError(401, 'not_authenticated', 'Please sign in.')
  const customer = db.customers.find((c) => c.user_id === user.id)
  const rest = publicUser(user)
  return { ...rest, permissions: user.roles.flatMap((r) => PERMS[r]), customer_id: customer?.id ?? null, tenant_id: 'demo' }
}
function need(permission) {
  const p = principal()
  if (!p.permissions.includes(permission)) throw new DemoError(403, 'forbidden', 'You do not have permission to do this.')
  return p
}
function publicUser(user) {
  const copy = { ...user }
  delete copy.password
  return copy
}
const audit = (action, entity_type, entity_id, data = {}) =>
  db.audit.unshift({ id: newId(), action, entity_type, entity_id, actor_user_id: db.sessionUserId, data, created_at: new Date().toISOString() })

function page(items, url) {
  const limit = Number(url.searchParams.get('limit') ?? 25)
  const start = Number(url.searchParams.get('cursor') ?? 0)
  const next = start + limit < items.length ? String(start + limit) : null
  return { items: items.slice(start, start + limit), next_cursor: next }
}

function route(method, url, body) {
  const path = url.pathname.replace('/api/v1', '')
  const login = (user) => {
    db.sessionUserId = user.id
    user.last_login_at = new Date().toISOString()
    return { user: principal(), csrf_token: 'demo' }
  }

  if (method === 'GET' && path === '/auth/me') return principal()
  if (method === 'POST' && path === '/auth/login') {
    const user = db.users.find((u) => u.email === body.email.toLowerCase())
    if (!user || user.password !== body.password || !user.is_active) throw new DemoError(401, 'invalid_credentials', 'Email or password is incorrect.')
    audit('auth.login', 'user', user.id)
    return login(user)
  }
  if (method === 'POST' && path === '/auth/register') {
    if (db.users.some((u) => u.email === body.email.toLowerCase())) throw new DemoError(409, 'email_taken', 'An account with this email already exists.')
    const user = { id: newId(), email: body.email.toLowerCase(), full_name: body.full_name, password: body.password, roles: ['customer'], is_active: true, last_login_at: null, created_at: new Date().toISOString() }
    db.users.push(user)
    db.customers.unshift({ id: newId(), display_name: body.full_name, email: user.email, company: null, industry: null, business_size: null, phone: null, user_id: user.id, has_login: true, is_demo: true, created_at: user.created_at, addresses: [] })
    audit('auth.register', 'user', user.id)
    return login(user)
  }
  if (method === 'POST' && (path === '/auth/logout' || path === '/auth/logout-all')) {
    db.sessionUserId = null
    return { message: 'Signed out.' }
  }
  if (method === 'POST' && path === '/auth/forgot-password') return { message: 'If an account exists for that email, a reset link is on its way.' }
  if (method === 'POST' && path === '/auth/reset-password') throw new DemoError(400, 'invalid_reset_token', 'Password reset emails are not sent in prototype mode.')

  if (method === 'GET' && path === '/users') {
    need('users.read')
    const role = url.searchParams.get('role')
    return db.users.filter((u) => !role || u.roles.includes(role)).map(publicUser)
  }
  if (method === 'POST' && path === '/users/staff') {
    need('users.create_staff')
    if (db.users.some((u) => u.email === body.email.toLowerCase())) throw new DemoError(409, 'email_taken', 'An account with this email already exists.')
    const user = { id: newId(), email: body.email.toLowerCase(), full_name: body.full_name, password: body.password, roles: ['staff'], is_active: true, last_login_at: null, created_at: new Date().toISOString() }
    db.users.push(user)
    audit('users.create_staff', 'user', user.id, { email: user.email })
    return publicUser(user)
  }
  const toggle = path.match(/^\/users\/([^/]+)\/(activate|deactivate)$/)
  if (method === 'POST' && toggle) {
    need('users.manage')
    const user = db.users.find((u) => u.id === toggle[1])
    if (!user) throw new DemoError(404, 'not_found', 'User not found.')
    user.is_active = toggle[2] === 'activate'
    audit(`users.${toggle[2]}`, 'user', user.id)
    return publicUser(user)
  }

  if (path === '/customers/me') {
    const p = need('portal.access')
    const customer = db.customers.find((c) => c.id === p.customer_id)
    if (method === 'PATCH') Object.assign(customer, body, { email: customer.email })
    return customer
  }
  if (method === 'GET' && path === '/customers') {
    need('customers.read')
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    return page(db.customers.filter((c) => !q || [c.display_name, c.email, c.company ?? ''].some((v) => v.toLowerCase().includes(q))), url)
  }
  if (method === 'POST' && path === '/customers') {
    need('customers.write')
    const customer = { id: newId(), ...body, email: body.email.toLowerCase(), user_id: null, has_login: false, is_demo: true, created_at: new Date().toISOString(), addresses: (body.addresses ?? []).map((a) => ({ id: newId(), ...a })) }
    db.customers.unshift(customer)
    audit('customers.create', 'customer', customer.id)
    return customer
  }
  const one = path.match(/^\/customers\/([^/]+)$/)
  if (one) {
    need(method === 'GET' ? 'customers.read' : 'customers.write')
    const customer = db.customers.find((c) => c.id === one[1])
    if (!customer) throw new DemoError(404, 'not_found', 'Customer not found.')
    if (method === 'PATCH') {
      Object.assign(customer, body, { addresses: (body.addresses ?? customer.addresses).map((a) => ({ id: newId(), ...a })) })
      audit('customers.update', 'customer', customer.id, { fields: Object.keys(body).sort() })
    }
    return customer
  }
  if (method === 'GET' && path === '/audit') {
    need('audit.read')
    return page(db.audit, url)
  }
  throw new DemoError(404, 'not_found', `Not available in prototype mode: ${method} ${path}`)
}

export async function demoFetch(method, path, body) {
  await new Promise((resolve) => setTimeout(resolve, 250)) // feel like a network call
  const result = route(method, new URL(`/api/v1${path}`, window.location.origin), body)
  persist()
  return structuredClone(result)
}

export function resetDemo() {
  db = seed()
  persist()
}

export { DemoError }
