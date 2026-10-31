# Brightloop Backend (Person 2)

Node + Express + Prisma + PostgreSQL. Saare amounts **paise** mein (Rs 1,000 = 100000).

## Run (pehli baar)
```bash
npm install
cp .env.example .env          # DATABASE_URL apna password/db ke hisaab se badlo
npx prisma migrate dev --name init
npm run seed:min              # admin / staff / customer + 1 product, plan, template
npm run dev                   # http://localhost:5000
npm run smoke                 # (naye terminal mein) end-to-end check
```
Logins: admin@brightloop.com / Admin@1234 | staff@brightloop.com / Staff@1234 | customer@brightloop.com / Customer@1234

## Folder
```
src/modules/<name>/routes.js (+ service.js jahan logic bhaari hai)
auth users customers taxes products plans templates   -> CRUD + auth
subscriptions (status.js = status machine)            -> create, status flow, renew, daily jobs
billing (billing.service.js)                          -> runBilling: catch-up loop + UNIQUE guard
invoices payments discounts portal
pricing/pricing.service.js                            -> PERSON 3 KA FILE (starter version hai)
jobs/scheduler.js                                     -> node-cron 00:05 daily
```

## API (sab /api ke neeche)
| Area | Endpoints |
|---|---|
| Auth | POST /auth/signup, /auth/login, /auth/forgot-password, /auth/reset-password; GET /auth/me |
| Users | POST /users/staff (Admin), GET /users (Admin), PUT /users/:id/active |
| Customers | GET/POST /customers, GET/PUT/DELETE /customers/:id |
| Catalog | /taxes, /products (+ /products/:id/variants), /plans: GET list/one, POST, PUT (Admin write, Staff read) |
| Templates | GET/POST /quotation-templates, GET/PUT/DELETE /:id |
| Subscriptions | POST/GET /subscriptions, GET/PUT /:id, POST /:id/status {to}, POST /:id/renew |
| Sub discounts | POST /subscriptions/:id/discounts {discountId}, DELETE /subscriptions/:id/discounts/:discountId |
| Billing | POST /billing/run -> { created, alreadyBilled, upToDate } |
| Invoices | GET /invoices?status=&overdue=true&customerId=&page=, GET /:id, POST /:id/confirm /cancel /send, GET /:id/payments |
| Payments | POST /payments, GET /payments?from=&to=&method= |
| Discounts | GET/POST /discounts, GET/PUT /discounts/:id |
| Portal (Customer) | GET /portal/subscriptions, /portal/subscriptions/:id, /portal/invoices, /portal/invoices/:id |

Lists: `{ data, meta: { page, pageSize, total } }`. Errors: `{ error: { message } }`.

## Business rules jo implement hain
- Password: 9+ chars, upper, lower, special (signup + reset, backend pe).
- Public signup = CUSTOMER; staff sirf Admin banata hai; portal queries customer se scoped (doosre ka ID = 404).
- Status: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE <-> PAUSED -> CLOSED. Illegal jump = 400. Pause/close/renew plan flags se. Har change history mein.
- Billing: invoice CONFIRMED banta hai; UNIQUE(subscriptionId, periodStart) double billing rokta hai; catch-up loop missed periods bill karta hai; discount usage atomic reserve hota hai.
- Overdue stored nahi, calculate hota hai (`isOverdue`, `daysOverdue`).
- Invoice cancel -> discount usage wapas.

## Testing tip (3 periods miss)
`POST /api/billing/run` body `{ "asOf": "2027-02-15" }` (sirf non-production) future date simulate karta hai.

## Person 3 se integrate
- `pricing.service.js` unka hai. Signature same rakhna: `priceLines(lines, { discounts, today })`.
- Reports API (`/api/reports/*`) Person 3 banayega; `app.js` mein ek line `app.use("/api/reports", ...)` add karni hai.
- Schema change hone par: `npx prisma migrate dev` aur `npx prisma generate`.
