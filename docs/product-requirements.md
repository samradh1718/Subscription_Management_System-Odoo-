# Brightloop Subscription OS — Product Requirements

*The operating system for subscription businesses.* Manage subscriptions. Understand customers.
Build trust.

This is the condensed, testable form of the product blueprint. The full blueprint remains the
reference; where they differ, `decisions.md` records why.

## 1. Problem

Subscription businesses track contracts in spreadsheets, remember renewals manually, type
invoices by hand, match payments by eye and assemble reports at quarter end. Prospective buyers
cannot talk to real users. Brightloop replaces each of these with a system workflow.

Core principle: **deterministic code handles money; PostgreSQL handles information; ML finds
patterns; language models only explain them.** Every AI feature is optional.

## 2. Users and roles

| Role | Can | Cannot |
|---|---|---|
| **Admin** | Everything in the tenant: catalogue, plans, taxes, discounts, staff accounts, billing runs, job failures, analytics, audit log, peer moderation, settings | Act on another tenant |
| **Staff** | Customers, quotations, subscriptions (within permissions), invoices (view/confirm/send/print/cancel where permitted), record payments, permitted reports | Create staff/admin accounts, change roles, configure tax/discount policy, read audit log |
| **Customer** | Own account, subscriptions, quotations, invoices, payments; browse catalogue; request changes; simulated payments; peer consent and Q&A | See any other customer's data; any staff operation |
| **Prospect** (anonymous) | Public catalogue, plan details, privacy-safe peer counts, register | Anything authenticated |

Authorization is enforced on the backend for every request; hidden buttons are never the control.

## 3. Priorities

* **P0** — auth, sessions, RBAC, tenancy; customers; products/variants/versioned prices; plans
  (daily/weekly/monthly/quarterly=3 months/yearly); quotation templates and quotations;
  subscription lifecycle; billing scheduler + worker; invoices, taxes, discounts; payment
  simulator with allocations, failures and refunds; audit log.
* **P1** — admin/staff/customer portals, self-service, finance dashboard (MRR, ARR, collections,
  receivables, overdue ageing), PDF invoices, seed data, benchmarks, Docker Compose.
* **P2** — peer trust network, browser ML, natural-language filters, segmentation and pattern
  insights.
* **P3 (excluded)** — real payment gateways, real-time chat, ERP/accounting suite, tax filing,
  crypto, microservices/Kubernetes/Kafka/Elasticsearch, native mobile, autonomous agents.

P0 correctness beats P2 feature count.

## 4. Functional requirements and acceptance criteria

### 4.1 Identity (Phase 1)

* Register with full name, email, password. Email unique per tenant, case-insensitive.
* Password: more than 8 characters, ≥1 uppercase, ≥1 lowercase, ≥1 special character
  (backend-enforced; frontend mirrors it for feedback only).
* Login issues a server-side session (HttpOnly cookie). Logout revokes it; "log out everywhere"
  revokes all of a user's sessions.
* Forgot password always returns the same response; a single-use token valid 30 minutes is
  emailed (Mailpit locally). Reset revokes all sessions.
* Public registration always creates a **customer**. Only admins create staff. Nobody can create
  or promote an admin through the API.
* Deactivated users cannot log in and their sessions are revoked.

**Acceptance:** duplicate/case-variant emails rejected · weak passwords rejected by API · reset
tokens expire and cannot be reused · sessions revocable · staff cannot create staff/admin ·
customer A cannot read customer B · tenant A cannot read tenant B · CSRF token required for
cookie-authenticated mutations.

### 4.2 Catalogue and plans (Phase 2)

* Product: name, type (service/goods/add-on), description, sales price, cost price, currency,
  internal notes, active flag.
* Variant: name + fixed price adjustment. Effective price = base + adjustment (e.g. Business
  Suite ₹2,000; Standard +₹0, Odoo +₹560, Enterprise +₹1,500).
* Prices are effective-dated; contracts and invoices store snapshots, so catalogue changes never
  rewrite history.
* Plan: one or more product lines, interval unit (day/week/month/year) × interval count
  (quarterly = month × 3), price, currency, minimum quantity, availability window, trial, renew /
  pause / early-cancel / auto-close policies, status draft/published/archived.

### 4.3 Quotations and subscriptions (Phase 2)

* Templates pre-fill plan, lines, quantities, prices, payment terms, validity.
* Quotation: Draft → Sent → Accepted | Rejected | Expired. Acceptance is idempotent and creates
  exactly one subscription with snapshotted terms.
* Subscription states: Draft, Pending Confirmation, Active, Paused, Past Due, Cancellation
  Scheduled, Cancelled, Expired, Closed — transitions per `system-architecture.md §5.2`, each
  recorded with actor, time, reason.

### 4.4 Billing (Phase 3 — highest technical priority)

* Due subscriptions produce exactly one invoice per billing period, under retries, crashes and
  concurrent workers.
* Periods computed from the original anchor with month-end clamping (Jan 31 → Feb 28/29 →
  Mar 31), leap years, quarterly and yearly cycles; timestamps stored in UTC, displayed in the
  tenant time zone (`Asia/Kolkata` for the demo tenant).
* Schedule advances when the invoice commits, not when payment succeeds.
* Failed jobs back off exponentially and land in a visible dead state; no period is silently
  skipped.

### 4.5 Invoices, tax, discounts, payments (Phases 3–4)

* Invoice lines snapshot description, quantity, unit price, discount, tax name/rate/amount.
* States Draft, Open, Partially Paid, Paid, Void; overdue derived. No deletes — void with audit.
* Tax rules: rate, scope (products/plans), effective dates, inclusive/exclusive. Rounding:
  half-up to 2 decimals per line.
* Discounts: fixed or percent; product or subscription scope; min order value/quantity; date
  window; max redemptions reserved transactionally; no stacking within a scope in v1.
* Payments: simulated only (`MockPaymentProvider`): success, failure, pending, retry, partial,
  refund. Methods UPI/card/bank transfer/cash/cheque/other — no card data collected. Allocations
  many-to-many between payments and invoices. Provider events processed idempotently.
* PDF invoices (ReportLab), downloadable only by the owning customer or authorised staff.

### 4.6 Portals (Phase 4)

Admin console, staff workspace and customer portal as listed in the blueprint §13, each
role-specific, responsive, with loading/empty/error/success states and no inert buttons.

### 4.7 Analytics (Phase 5)

KPIs: active/new subscriptions, MRR, ARR, collections, refunds, receivables, overdue ageing,
active customers, renewal rate, churn rate, failed-payment rate, upcoming renewals; filters by
date, product, plan, frequency, segment, subscription/payment/invoice state.

Metric definitions (single implementation each):

* **MRR** = Σ active recurring line value normalised to a month, after recurring discount,
  excluding tax and one-time fees. Day: × 365 ÷ 12 ÷ count; week: × 52 ÷ 12 ÷ count;
  month: ÷ count; year: ÷ (12 × count).
* **ARR** = MRR × 12.
* **Collections** = successful payments in window; refunds reported separately (gross) and net.
* **Receivables** = Σ balance of Open + Partially Paid invoices (not Draft/Void).
* **Logo churn (month)** = customers whose last active subscription ended in the month ÷
  customers active at month start. Revenue churn reported separately.

### 4.8 Peer trust network (Phase 6)

Verified = has an active subscription. Participation is explicit, revocable opt-in with chosen
topics and named/anonymous display. Async Q&A only. Rate-limited questions, accept/decline,
report/block, moderation queue, audit. Aggregate counts shown only above a minimum cohort size
(k ≥ 5). No fabricated profiles; demo content labelled.

### 4.9 AI/ML (Phase 7)

Natural-language → JSON filter → schema validation → allowlisted compiler → tenant-scoped
parameterised SQL; rule-based fallback; never model-generated SQL. Churn baseline (logistic
regression) with time-based split and honest metrics; deterministic segments first; anomaly
insights with baseline, sample size and limitations; ONNX parity tests; Web Worker inference
with WebGPU → WASM fallback.

## 5. Non-functional requirements

* Zero paid services; fully local via Docker Compose; works offline after dependencies download.
* p95 < 2 s for ordinary list/dashboard requests at the documented dataset (5k customers,
  10k subscriptions, 100k invoices, 150k payments/allocations, 20k quotations) — measured, not
  claimed.
* Security reference: OWASP ASVS. No secrets in the repo or logs.
* Accessibility: keyboard navigation, visible focus, WCAG AA contrast.
