# Implementation Roadmap

Each phase ends with a runnable application and passing tests for its scope. Status is updated
at the end of every phase with what works, what was tested and what remains.

| Phase | Scope | Exit criterion | Status |
|---|---|---|---|
| 0 | Repository assessment, architecture, ERD, state machines, decisions, `.env.example` | Reviewed design + project skeleton | **Done** |
| 1 | FastAPI + Vite skeletons, PostgreSQL + Compose, Alembic, health, tenants, register/login/logout, sessions, CSRF, password reset, RBAC, customer isolation, audit log | All roles sign in and reach only permitted pages/APIs; tests pass | **Done** — see below |
| 2 | Products, variants, price history, plans, quotation templates, quotation lifecycle, accept → subscription | Quote-to-subscription vertical slice | Not started |
| 3 | Subscription transitions, billing date service, jobs table, scheduler, worker, invoices, tax, discounts, outbox, retries | Due subscriptions generate exactly one correct invoice under retry/concurrency tests | Not started |
| 4 | Payment provider abstraction, mock provider, allocations, refunds, PDFs, customer portal, staff workspace, Mailpit notifications | Simulated purchase → payment → invoice journey | Not started |
| 5 | Metric definitions, dashboard, summary tables, cursor pagination, synthetic 5k/10k/100k dataset, EXPLAIN, load test | Dashboard reconciles to source; performance report | Not started |
| 6 | Peer eligibility, consent history, privacy, matching, Q&A, report/block/moderation | Consent-based Q&A with privacy tests | Not started |
| 7 | Features, training, ONNX export, parity tests, Web Worker inference, NL filters | At least one browser-executed model with parity + fallback | Not started |

## Repository assessment (Phase 0, 2026-10-31)

* `main` contained a committed **Node/Express + Prisma** backend (auth, catalog, subscriptions,
  billing with a unique-period guard, invoices, payments, discounts, portal) and a
  **Vite + React** frontend with a styled auth page that was not connected to any API.
* The working tree (uncommitted, author's own) removed the Node backend and replaced it with a
  partial **FastAPI** skeleton from `brightloop/` that did not import (missing
  `app.models.identity`, empty schemas, no `main.py`).
* Decision (by the project owner): build the backend on **FastAPI per the blueprint**, keep the
  **Vite + React** frontend converted to TypeScript. The Node backend stays available in git
  history (`main` @ `bf37fd5`) as a reference for business rules. See `decisions.md` D-001/D-002.
* Runtimes: Node 24.13, npm 11.6, Python 3.12 (via uv; system Python 3.14 is too new for some
  binary wheels), Docker 29.3 + Compose v5.1, PostgreSQL 16 (container).

## Phase 1 report

Filled in at the end of the phase — see the bottom of this file.
