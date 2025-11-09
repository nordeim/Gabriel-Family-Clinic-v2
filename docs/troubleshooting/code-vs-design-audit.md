## Code vs Design: Cross-Phase Audit

Summary
-------
This document cross-checks the project's design and phase documents against the current repository state. It lists the major features described in the docs, maps them to code locations, records the implementation status (Implemented / Partial / Missing / Needs cleanup), highlights risks, and gives prioritized next actions to reach a consistent, shippable state.

Methodology
-----------
- Read high-level design and phase docs (notably `Project_Requirements_Document.md`, `Project_Architecture_Document.md`, `Enhancement-*.md`).
- Search the codebase for canonical implementations (APIs, routers, integrations, pages, jobs, migrations).
- Mark status and call out mismatches, missing tests, env/config risks, and linter/type debt.

Scope
-----
Focused on the core user-facing and backend subsystems: auth, appointments/booking, payments, telemedicine, messaging/integrations, background jobs, data schema/migrations, and infra/config.

1) Authentication
------------------
- Design references: `Project_Architecture_Document.md` and auth sections in `Project_Requirements_Document.md` describe provider-based sign-in and role-based sessions for patients/doctors/admins.
- Code mapping:
  - `src/server/auth/config.ts` (typed NextAuthOptions)
  - `src/app/api/auth/[...nextauth]/route.ts` (NextAuth handler)
  - `src/server/auth/index.ts` (legacy helper wrapper)
- Status: Implemented (core). NextAuth is wired and typed; previous runtime bundling issues were remedied by constructing the handler in-route.
- Gaps / Risks:
  - Environment variables for providers are optional in `src/env.js` — OK for local builds but ensure production secrets are set.
  - Need automated tests for session shapes and role-gating (doctor/admin).

2) tRPC API & Business Logic
-----------------------------
- Design references: tRPC routers described in `Project_Architecture_Document.md` and multiple enhancement docs.
- Code mapping:
  - `src/server/api/trpc.ts` (context + init)
  - `src/app/api/trpc/[trpc]/route.ts` (server adapter)
  - `src/trpc/react.tsx` and `src/trpc/server.ts` (client/provider helpers)
  - Routers: `lib/trpc/routers/*.ts` (doctor, patient, consultation, feedback, clinic, etc.)
- Status: Partial → core router scaffolding and many procedures are present and call Supabase, but several procedures use permissive typing and some error handling uses generic messages.
- Gaps / Risks:
  - Type completeness: many responses from Supabase are presumed shapes; consider adding result normalization helpers and stronger types (Prisma/DB-generated types or zod validations).
  - No contract tests for key routers (appointments, payments, webhooks).

3) Appointments / Booking
-------------------------
- Design references: `Enhancement-1.md` and migrations describe appointment slots and appointments tables.
- Code mapping:
  - Routers: `lib/trpc/routers/appointment*` and `lib/trpc/routers/consultation.router.ts` (consultation and appointment logic)
  - Types: `types/zod-schemas.ts` contains appointment zod schemas
  - Migrations: `migrations/00004_appointment_slots.sql`, `migrations/00005_appointments.sql` documented in `Enhancement-1.md` (verify in repo)
- Status: Partial → the high-level flows exist. Supabase queries are used directly in routers.
- Gaps / Risks:
  - No exhaustive server-side validations for slot overlaps or concurrent booking idempotency documented/tested.
  - Missing explicit integration tests for booking flows (create, cancel, reschedule).

4) Payments (Stripe)
---------------------
- Design references: `Enhancement-3.md` (Stripe webhook contract, idempotency guidance) and docs/integrations/stripe.md mentioned.
- Code mapping:
  - Webhook endpoint referenced in build output: `/api/webhooks/stripe` (search: file exists under `src/app/api/webhooks/stripe` or `pages/api/webhooks/stripe`) — verify code exists.
  - Payment pages: `pages/dashboard/payments/pay/[appointmentId].tsx`, `pages/dashboard/payments/success.tsx` (client-side flows)
- Status: Partial → high-level endpoints and pages exist, but webhook processing and idempotency need tests and hardened verification.
- Gaps / Risks:
  - Webhook signature verification and idempotency must be enforced in production; add unit tests and example payload fixtures.
  - Stripe secret env vars are optional in `src/env.js` — ensure the deploy pipeline provides them.

5) Telemedicine (Daily)
------------------------
- Design references: `Enhancement-3.md` and docs/integrations/daily.md
- Code mapping:
  - Telemedicine pages: `pages/dashboard/telemedicine/consultation/[appointmentId]` and `pages/doctor/consultations/[appointmentId]`
  - Integration notes exist in `Enhancement-3.md`
- Status: Partial → UI pages and placeholders exist; integration scaffolding (session keys, webhook handling) appears referenced but needs validation with Daily API keys and tests.
- Gaps / Risks:
  - Daily API key is optional in env schema. Add runtime checks and integration tests.

6) Messaging / Notifications (Twilio/Resend)
------------------------------------------
- Design references: `Enhancement-3.md`, docs/integrations/whatsapp.md (Twilio), docs/integrations/resend.md expected.
- Code mapping:
  - `lib/integrations/resend.ts` (mail sending helper)
  - Twilio usage likely present in `lib/integrations/*` or in jobs code; env keys referenced in `src/env.js`.
- Status: Partial → helpers exist but need verification and contract docs.
- Gaps / Risks:
  - Missing idempotency and retry semantics for outbound messages; add tests and job-level idempotency.

7) Background Jobs / Queue
--------------------------
- Design references: `Enhancement-3.md` contains jobs notes and `jobs:` entries in various docs.
- Code mapping:
  - `lib/jobs/queue.ts` (Supabase jobs table interactions)
  - `lib/jobs/types.ts` (job types; cleaned to remove anonymous default export)
  - Cron route: `/api/cron/process-jobs` referenced in build output
- Status: Implemented (basic). Jobs table insert/update logic exists and jobs are polled/processed.
- Gaps / Risks:
  - Need deterministic retry/backoff and stronger typing for job payloads.
  - Add unit tests for job processing and for retry/backoff behavior.

8) Data Schema & Migrations
---------------------------
- Design references: `Enhancement-1.md` and `database_schema.md`.
- Code mapping:
  - `migrations/` (migration files referenced in Enhancement docs)
  - `types/database.types.ts` (placeholder replaced by generated types when present)
- Status: Partial → migration SQL and docs exist, but generated DB types are not yet wired in (type files are stubs).
- Gaps / Risks:
  - Generate DB types (Prisma or Supabase typed client) and wire into tRPC routers to eliminate many shape assumptions.

9) Pages / UI
-------------
- Design references: `Project_Requirements_Document.md`, various phase docs describing admin, doctor, patient flows.
- Code mapping: many pages under `pages/` and `src/app/` (dashboard, admin, doctor, patient, health-screening, payments).
- Status: Implemented (surface). Many pages exist; several had ESLint unused-var issues that were fixed by prefixing with `_`.
- Gaps / Risks:
  - Several pages are thin wrappers or redirects (e.g., `pages/admin/login.tsx` redirects to `/login`). Confirm intended UX.
  - Add E2E tests (Playwright config present) for critical flows: patient booking, doctor consult join, payment flow.

10) CI / Lint / Type Hygiene
---------------------------
- Status: Partially addressed. The build was unblocked after several small fixes (NextAuth route, type-only imports, anon default export removal). `next build` currently completes but emits warnings.
- Action items:
  - Systematically fix `@typescript-eslint/no-unused-vars` warnings (prefix intended unused vars with `_` or remove them).
  - Migrate permissive `any`/`unknown` usages to correct types where feasible.
  - Add CI checks that run type-check, lint, and a small subset of unit tests.

Prioritized Next Steps (Phase B)
--------------------------------
1. Stabilize types and contracts (high priority)
   - Generate DB types (Prisma or supabase-generated) and replace shape assumptions in tRPC routers.
   - Add zod schemas for API responses where possible and validate Supabase results.

2. Add integration contract docs and tests (high priority)
   - Create `docs/integrations/stripe.md`, `docs/integrations/twilio.md`, `docs/integrations/daily.md` if missing; include payload examples and signature verification steps.
   - Add unit tests for webhook endpoints using example fixtures.

3. Add focused tests and CI
   - Unit tests for job processing, booking flow, and auth role enforcement.
   - Small Playwright E2E scenarios for booking -> payment -> consultation join.

4. Fix remaining lint warnings
   - Run `npm run lint`, capture all no-unused-vars and consistent-type-imports places, and fix incrementally (map to PRs).

5. Review env handling for production
   - Ensure secrets required in production are not optional at deploy time (or fail fast at startup with clear error messages).

Appendix: Quick file map (non-exhaustive)
--------------------------------------
- Auth: `src/server/auth/config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/auth/index.ts`
- tRPC core: `src/server/api/trpc.ts`, `src/app/api/trpc/[trpc]/route.ts`, `src/trpc/react.tsx`
- Routers: `lib/trpc/routers/*.ts` (doctor, patient, consultation, clinic, feedback, etc.)
- Jobs: `lib/jobs/queue.ts`, `lib/jobs/types.ts`
- Supabase clients: `lib/supabase/client.ts`, `lib/supabase/admin.ts`
- Payments/pages: `pages/dashboard/payments/*` and webhook routes under `src/app/api/webhooks/stripe` or `pages/api/webhooks/stripe`
- Telemedicine pages: `pages/dashboard/telemedicine/*`, `pages/doctor/consultations/*`

Closing summary
---------------
The codebase contains a solid scaffold that matches the design docs for core subsystems. The highest-value next work is to tighten types (DB types + zod), add contract tests for external integrations (Stripe/Daily/Twilio/Resend), and systematically clean remaining lint warnings. After those steps the repo will be safer for production and easier to review in a PR.

If you want, I can:
- open a Phase-B TODO branch and create incremental PR-ready patches implementing the top 3 items (types, webhook tests, CI additions), or
- start by generating DB type artifacts and wiring them into one router (e.g., appointments) as a concrete example.

-- Audit generated by GitHub Copilot (automated repo scan)
