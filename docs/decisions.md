# Decision Log

Each entry: context → decision → consequences. Newest last. Do not rewrite old entries;
supersede them with a new one.

## D-001 — Backend on FastAPI, not the existing Node/Prisma backend
*2026-10-31, decided by project owner.*
The repo had a working Node/Express + Prisma backend and a broken FastAPI skeleton. The
blueprint mandates Python/FastAPI/SQLAlchemy/Alembic (and the ML stack is Python).
**Decision:** build on FastAPI. The Node backend remains in git history (`bf37fd5`) and its
business rules (unique period guard, catch-up billing, atomic discount reservation, derived
overdue) are ported, not discarded. The non-importing skeleton files for later phases
(`models/catalog.py`, `models/subscription.py`, `models/billing.py`, `workers/billing_worker.py`,
`api/v1/quotations.py`, `services/*`, `repositories/base.py`) were removed from the working tree;
they are re-implemented properly in Phases 2–3 (they used `float` for money, string UUIDs, a
hard-coded invoice amount and drift-prone date arithmetic). Originals remain in git history
under `brightloop/backend/`.

## D-002 — Keep Vite + React (TypeScript) instead of Next.js
*2026-10-31, decided by project owner.*
**Decision:** keep the existing Vite SPA, migrate it to strict TypeScript, add React Router.
**Consequences:** all data access goes through FastAPI (which the blueprint requires anyway);
static hosting is trivial; no server components. shadcn/ui, TanStack Table, Recharts,
React Hook Form are added when the phase that needs them starts, not up front.

## D-003 — Python 3.12 managed by uv
System Python is 3.14, for which some binary wheels (argon2-cffi-bindings, psycopg-binary) can
lag. **Decision:** pin `requires-python = ">=3.12,<3.13"`, manage with `uv`, Docker image
`python:3.12-slim`. One lockfile (`backend/uv.lock`) for reproducible installs.

## D-004 — Same-origin API via proxy; cookie sessions + double-submit CSRF
Frontend and API are served from one origin (Vite dev proxy, nginx in Docker). Sessions are
opaque random tokens in an HttpOnly cookie, SHA-256 hashed at rest. CSRF: a random token is set
in a readable `bl_csrf` cookie at login, its hash is stored on the session, and every
cookie-authenticated unsafe request must echo it in `X-CSRF-Token`. JWTs were rejected because
they cannot be revoked server-side without a session table anyway.

## D-005 — Email unique per tenant; tenant resolved from configuration
Users are unique on `(tenant_id, lower(email))`, stored lower-cased with a CHECK constraint.
The demo runs one tenant (`brightloop`); the API resolves the tenant from `DEFAULT_TENANT_SLUG`
(overridable per request with the `X-Tenant` header for tests/future multi-tenancy). After login
the tenant always comes from the session, never from input.

## D-006 — Registration does not auto-link pre-existing customer records
Staff may create a customer record before the person registers. Linking it automatically by
email on registration would let anyone who registers with that address read the records
without proving they own the mailbox. **Decision:** registration always creates a new customer
profile in Phase 1. Linking will be done through an emailed invitation (proof of mailbox) in
Phase 4.

## D-007 — Audit log is append-only at the database level
A PostgreSQL trigger raises on `UPDATE`/`DELETE` of `audit_logs`. The application role cannot
modify history even by mistake; a superuser can still disable the trigger, which is documented
as a limitation rather than claimed impossible.

## D-008 — In-process rate limiter
Login/register/forgot/reset are limited per IP + per email with an in-memory sliding window.
Correct for the single-process local deployment; behind multiple API processes the effective
limit multiplies by the process count. A PostgreSQL-backed limiter is the upgrade path if we
ever run more than one API process (no Redis until profiling justifies it).

## D-009 — Password-reset email sent synchronously in Phase 1
Until the outbox dispatcher exists (Phase 3), the reset email is sent inside the request via
SMTP to Mailpit. Failure is logged (without the token) and does not change the response, so it
cannot be used for account enumeration. Moves to the outbox in Phase 3.

## D-010 — Money as `numeric(14,2)`, rates as `numeric(7,4)`, Python `Decimal`
No floats anywhere in financial paths. Rounding: `ROUND_HALF_UP` to 2 dp per line, totals are
sums of rounded lines.

## D-011 — UUID primary keys, human sequence numbers separately
Primary keys are `uuid` (`gen_random_uuid()`), which avoids enumerable IDs in URLs. Human
numbers (`SUB-000123`, `INV-2026-000045`) are separate columns, unique per tenant, generated from
a per-tenant counter row locked inside the creating transaction.
