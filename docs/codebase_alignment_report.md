# Gabriel Family Clinic v2.0 — Codebase Alignment Report (Meticulous Baseline)

Date: 2025-11-11  
Owner: AI Coding Agent (Kilo Code)  
Status: Authoritative snapshot of understanding based on AGENT.md, Design_Review_3.md, troubleshooting docs, and current repository state.

---

## 1. Purpose

This document captures a precise, durable baseline of:

- What the project is supposed to be (from AGENT.md, Design_Review_3.md, and architecture docs).
- What is actually implemented in this repository right now.
- Where there is alignment.
- Where there are gaps, drift, or legacy/spec-only artifacts.
- Concrete recommendations on how to operate and evolve the codebase safely under the Meticulous Approach.

This should be treated as the canonical reference for future contributors and AI agents when making design or implementation decisions.

---

## 2. Target Architecture (From Project Docs)

Summarized intended system:

- Stack:
  - Next.js (Pages / App Router) + TypeScript
  - tRPC as the primary API layer
  - Supabase (Postgres, Auth, Storage, Realtime) as backend platform
  - Tailwind CSS + Mantine for UI
  - Zod for validation
  - Stripe, Twilio/WhatsApp, Resend, Daily.co integrations
- Patterns:
  - Database-first with ordered SQL migrations
  - Repository + Service layers; thin controllers/routers
  - Strong security: PDPA/MOH-aligned, RLS, encryption, audit logging
  - Idempotent and concurrency-safe booking; webhook-driven workflows
  - Background jobs and retry-safe processing
  - CI: migrations dry-run, type-check, lint, tests
- Operating principles:
  - Meticulous, conservative changes
  - Avoid over-engineering but preserve strong architectural foundations
  - Accessibility and elderly-friendly UX

---

## 3. Current Implementation Snapshot

Key observed implementation elements (non-exhaustive, focused on sources of truth):

### 3.1 API and tRPC

- `tRPC` core:
  - [`src/server/api/trpc.ts`](src/server/api/trpc.ts:1):
    - Initializes tRPC with `superjson` and Zod-aware error formatting.
    - Exposes `createTRPCRouter`, `createCallerFactory`, and procedures.
  - [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/%5Btrpc%5D/route.ts:1):
    - Wires the `appRouter` using `fetchRequestHandler` (App Router compatible).
  - [`src/server/api/root.ts`](src/server/api/root.ts:1):
    - Defines `appRouter` and exports `AppRouter` type and `createCaller`.

- Additional tRPC machinery:
  - [`lib/trpc/server.ts`](lib/trpc/server.ts:1), [`lib/trpc/client.ts`](lib/trpc/client.ts:1), [`lib/trpc/context.ts`](lib/trpc/context.ts:1):
    - Provide an alternative/legacy-style tRPC setup (Supabase context).

Status:  
tRPC is real and functional. There are effectively two tRPC stacks:
- T3-style under `src/server/api/*` (Prisma-centered).
- Supabase-style scaffolding under `lib/trpc/*`.

### 3.2 Authentication

- NextAuth with Prisma:
  - [`src/server/auth/config.ts`](src/server/auth/config.ts:1):
    - Exports typed `authConfig: NextAuthOptions` with `PrismaAdapter(db)` and a Discord provider.
  - [`src/server/auth/index.ts`](src/server/auth/index.ts:1):
    - Constructs NextAuth handler and exports `auth`, `handlers`, `signIn`, `signOut`.
  - [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/%5B...nextauth%5D/route.ts:1):
    - Uses the typed `authConfig` without unsafe casts.

Status:  
Authentication is implemented with NextAuth + Prisma (not Supabase Auth). This is consistent and buildable.

### 3.3 Database and Migrations

- Foundational migrations (examples):
  - [`database/migrations/001_initial_setup.sql`](database/migrations/001_initial_setup.sql:1):
    - Extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `citext`, etc.).
    - Schemas: `clinic`, `audit`, `archive`, `booking`, `webhook`.
    - `public.update_updated_at_column()` trigger.
  - [`database/migrations/002_enum_types.sql`](database/migrations/002_enum_types.sql:1):
    - Core enums for roles, statuses, CHAS, etc.
  - [`database/migrations/003_core_identity_tables.sql`](database/migrations/003_core_identity_tables.sql:1):
    - `clinics` and `users` tables with tenancy and security fields.
  - [`database/migrations/004_core_clinical_tables.sql`](database/migrations/004_core_clinical_tables.sql:1):
    - `patients`, `doctors`, `staff` with PDPA-aware modeling and constraints.
  - [`database/migrations/010_audit_setup.sql`](database/migrations/010_audit_setup.sql:1):
    - Partitioned `audit.audit_logs` and generic audit trigger function.
  - [`database/migrations/013_booking_transaction.sql`](database/migrations/013_booking_transaction.sql:1):
    - `booking_requests` table and `booking.create_booking` function implementing concurrency-safe, idempotent booking logic.

- Tooling:
  - [`package.json`](package.json:1):
    - `db:run-migrations`, `db:run-seeds` scripts exist and hook into `scripts/run-migrations.js` / `scripts/run-seeds.js` (scripts present in repo).

Status:  
The migration set is substantial and largely aligned with the documented database-first design, including audit and booking logic.

### 3.4 Integrations and Jobs

- Stubs and helpers exist (not exhaustively detailed here):
  - `lib/integrations/*.ts` for Resend, Twilio, Stripe, Daily.
  - `lib/jobs/queue.ts`, `lib/jobs/types.ts` for a DB-backed job queue.

Status:  
These are partial implementations / scaffolds, not fully hardened according to Design_Review_3.

### 3.5 Frontend and UI

- Components under:
  - `components/` and `src/components/ui/` follow a modern, composable approach (Mantine-like + shadcn-like primitives).
- Pages:
  - Mix of `pages/` (legacy Pages Router) and `src/app/` (App Router) with routing for admin/doctor/etc.
- Build status:
  - As per troubleshooting docs, `next build` currently passes; remaining lint warnings are non-blocking.

---

## 4. Alignment: Where Design and Code Match

Key strong alignment points:

1. Database-First Architecture
   - Rich, ordered SQL migrations under `database/migrations/` implement:
     - Multi-schema separation (`clinic`, `audit`, `booking`, `webhook`).
     - Strong typing (enums), comprehensive domain modeling.
     - Audit logging and booking transaction logic.
   - This closely matches Enhancement and Design_Review_3 specifications.

2. tRPC as First-Class API
   - `src/server/api/trpc.ts` and `src/app/api/trpc/[trpc]/route.ts` implement a robust tRPC core with:
     - Superjson transformer.
     - Zod-aware error formatter.
   - Aligns with AGENT.md’s emphasis on type-safe APIs.

3. Security and Audit Emphasis
   - Audit trail implemented via `010_audit_setup.sql`.
   - Domain models include encrypted and hashed fields, consent flags, and compliance-friendly structure.
   - Consistent with PDPA-compliant posture in Design_Review_3.

4. Booking Concurrency and Idempotency
   - `013_booking_transaction.sql` implements the documented pattern for:
     - `booking_requests` idempotency table.
     - `booking.create_booking` function with `SELECT ... FOR UPDATE`.
   - Direct realization of the “enterprise-grade” booking design.

5. Tooling Direction
   - `package.json` scripts (`db:run-migrations`, `db:run-seeds`, `type-check`, `lint`) reflect the documented expectations.
   - Troubleshooting docs confirm alignment and successful `next build`.

Net: The repository is no longer “spec-only”; it contains substantial implementation aligned with the advanced design in key areas (DB, tRPC core, NextAuth, auditing, booking).

---

## 5. Misalignments and Gaps

This section targets practical differences that affect how contributors should reason about the system.

### 5.1 Supabase vs Prisma Reality

- Docs:
  - Emphasize Supabase as primary: DB, Auth, Storage, Realtime.
- Code:
  - Primary runtime path:
    - NextAuth + Prisma (`src/server/db.ts`, `src/server/auth/*`).
  - Supabase:
    - [`lib/supabase/client.ts`](lib/supabase/client.ts:1) is a minimal stub; not clearly wired as canonical.
- Implication:
  - Actual system is currently Prisma-first for auth/app data with Supabase primarily as conceptual or partial backend.
- Recommendation:
  - Decide and document:
    - Option A: Prisma as primary over a Postgres (can be Supabase-hosted) database; Supabase Auth not used.
    - Option B: Move to Supabase Auth/clients as described, refactoring NextAuth/Prisma accordingly.
  - Until decision: treat Prisma + NextAuth + migrations as canonical execution path.

### 5.2 Dual tRPC Stacks

- Present:
  - `src/server/api/*` (T3-style).
  - `lib/trpc/*` (alt implementation with Supabase context, routers in `lib/trpc/routers`).
- Risk:
  - Confusion, duplicated patterns, diverging middlewares.
- Recommendation:
  - Select one canonical tRPC stack:
    - Prefer the T3-style (`src/server/api/trpc.ts` + `src/app/api/trpc/[trpc]/route.ts`) as current live path.
  - Refactor or deprecate the non-canonical stack:
    - If `lib/trpc/*` is retained, align its context/types with the chosen DB/auth model.

### 5.3 Services/Repositories Pattern: Documented, Not Enforced

- Docs:
  - Strongly prescribe:
    - Repositories for DB access.
    - Services for business logic.
    - Thin routers.
- Code:
  - Most observable logic currently sits in routers or SQL; services/ layer is sparse or missing.
- Recommendation:
  - For new functionality:
    - Introduce `services/` and `repositories/` modules instead of embedding logic inside routers.
  - For existing logic:
    - Incrementally extract complex flows (e.g., booking, payments, notifications) into services that match the documented pattern.

### 5.4 Integrations and Webhooks: Partial, Not Production-Ready

- Docs:
  - Specify robust Stripe/Twilio/Resend/Daily/Webhook patterns (idempotency, DLQ, replay, etc.).
- Code:
  - Has stubs for integrations and jobs.
  - Does not fully implement everything described:
    - Webhook claim/ack state machines.
    - Strict signature verification and idempotent processing.
- Recommendation:
  - Treat all integrations as “beta scaffolding”.
  - Before relying on them in production:
    - Add contract tests (fixtures, signature verification).
    - Implement idempotency and retry patterns consistent with booking and webhook design specs.

### 5.5 Documentation Drift

- README and various docs:
  - Mention:
    - Supabase Auth as primary.
    - CI workflows that may not exist exactly as written.
    - Test commands (e.g., `test:unit`, `test:integration`, `test:coverage`) that are not fully wired.
- Risk:
  - New contributors and AI agents may trust docs over code and attempt non-existent flows.
- Recommendation:
  - Mark certain documents as:
    - “Current Canonical” vs “Design/Spec/Future-State”.
  - Update README and AGENT.md to:
    - Reflect Prisma + NextAuth as current implementation.
    - Clarify which scripts and pipelines are fully implemented vs planned.

### 5.6 Advanced Features (Healthier SG, Telemedicine, Analytics)

- Many advanced features are documented.
- Implementation is partial or absent (e.g., full telemedicine workflows, CHAS APIs, analytics pipelines).
- Recommendation:
  - Maintain them as strategic roadmap items.
  - Do not treat them as bugs; treat as future-phase tasks.

---

## 6. Operational Guidelines (For Future Changes)

These guidelines operationalize the Meticulous Approach against the actual state.

1. Source of Truth Hierarchy
   - Level 1: Actual code and SQL in this repo.
   - Level 2: AGENT.md, troubleshooting docs, this alignment report.
   - Level 3: Design_Review_3.md, Project_Architecture_Document*, Enhancement-* (strategic specs).

2. When Adding or Modifying Features
   - Use existing patterns:
     - Prefer `src/server/api/trpc.ts` + `appRouter` + thin routers.
     - Use Prisma via `src/server/db.ts` until/if Supabase is confirmed as the runtime stack.
     - Place complex domain logic into `services/` and `repositories/`.
     - Leverage the migrations framework in `database/migrations/`.
   - Ensure:
     - No reintroduction of `any`/unsafe patterns.
     - No plaintext PHI in logs.
     - Idempotency and concurrency safety for write paths that can be retried.

3. Handling Legacy/Alt Implementations
   - Before using any `lib/trpc/*`, `lib/supabase/*`, or integration stub:
     - Confirm it is wired into the current runtime.
     - If not, either:
       - Wire it properly following current stack choices, or
       - Treat as deprecated scaffolding (do not deepen divergence).

4. Security and Compliance
   - Follow the implemented audit and schema constraints.
   - When exposing patient/clinic data:
     - Enforce authentication and authorization (role-based).
     - Avoid logging sensitive fields.
   - For migrations:
     - Keep them idempotent and append-only.
     - Align with existing schemas and audit triggers.

---

## 7. Targeted Recommendations (Actionable Next Steps)

Short list of pragmatic, high-impact steps:

1. Declare Canonical Stack
   - Document clearly:
     - “Current implementation uses NextAuth + Prisma + custom migrations; Supabase is used as Postgres hosting and for specific features if/when wired.”
   - Update README and AGENT.md accordingly.

2. Consolidate tRPC
   - Choose `src/server/api/trpc.ts` + `appRouter` as canonical.
   - Either:
     - Migrate `lib/trpc/routers/*` into `src/server/api/routers/*`, or
     - Remove/annotate unused duplicates.

3. Introduce Real Service/Repository Layer
   - Start with:
     - Booking service (wraps `booking.create_booking`).
     - Patient/doctor service for core CRUD.
   - Keep routers thin and predictable.

4. Harden Integrations
   - For Stripe, Twilio, Resend, Daily:
     - Add docs under `docs/integrations/`.
     - Implement minimal, tested handlers with:
       - Signature verification.
       - Idempotency keys.
       - Safe logging.

5. CI & Lint Tightening
   - Add/verify GitHub Actions workflow to:
     - Run `npm run type-check`, `npm run lint`, `npm run build`, and migrations dry-run.
   - Gradually reduce lint warnings (esp. no-unused-vars, any/unknown).

6. Keep This Report Updated
   - When major decisions are made (e.g., “Supabase Auth is now canonical”), update this document and AGENT.md in the same PR.

---

## 8. How to Use This Document

- For maintainers:
  - Use this as the single reference when judging whether a change aligns with the project’s intended architecture.
- For AI agents:
  - Read this file and AGENT.md before generating or modifying code.
  - Prefer code-aligned facts here over older design documents where conflicts exist.
- For reviewers:
  - Use this report as a checklist:
    - Are new changes consistent with the canonical stack?
    - Do they reduce or increase divergence?

This alignment report is now the staged understanding and will be used as the baseline for all subsequent meticulous work on this repository.