README.md and AGENT.md are now updated to accurately reflect the current, passing state of the codebase, aligning architecture, tooling, and practices with reality for new contributors and AI agents.

Concise summary of what was aligned

1) Core architecture and stack (both docs)

- Clarified the canonical setup:

  - Next.js 14.2 with:
    - App Router (src/app) for new surfaces.
    - Legacy Pages Router (pages/) for existing dashboard/admin/doctor routes and APIs.
  - TypeScript strict mode.
  - tRPC v11 as the primary app API layer.
  - NextAuth + Prisma as the ONLY identity/session source of truth.
  - Supabase:
    - Used strictly as managed Postgres (plus optional storage/realtime).
    - Not used as a parallel auth system.
  - UI: Mantine + Tailwind.
  - Integrations: Stripe, Twilio, Resend, Daily as pluggable wrappers.
  - Strong ESLint + PDPA constraints enforced via build.

Impact:
- Removes outdated implication that Supabase Auth is primary.
- Emphasizes the NextAuth + Prisma decision already implemented in:
  - [`src/server/auth/config.ts`](src/server/auth/config.ts:1)
  - [`src/server/auth/index.ts`](src/server/auth/index.ts:1)

2) README.md — tech stack and env instructions

Key updates:
- Frontend section:
  - Generic versions updated (14.2.x / 5.9.x / 3.4.x / 7.x / etc.) to match package.json.
  - Explicitly notes:
    - App Router + legacy Pages coexist.

- Backend section:
  - Reframed to actual current architecture:
    - tRPC 11.x + Next.js API routes.
    - PostgreSQL via Supabase.
    - NextAuth + Prisma as auth.
    - Supabase only as DB / infra.

- Infrastructure:
  - Mentioned next-pwa usage consistent with next.config.
  - Left error tracking as pluggable, not hard-coded.

- Integrations:
  - Clarified they are behind wrappers and PDPA-conscious.

- Env section:
  - Calls out `src/env.js` as the validation source.
  - Consolidated the minimum env set:
    - NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
    - SUPABASE_SERVICE_ROLE_KEY
    - DATABASE_URL
    - APP_ENCRYPTION_KEY
    - NextAuth provider secrets (e.g., AUTH_DISCORD_ID/SECRET)
  - Explicit warning:
    - No leaking SUPABASE_SERVICE_ROLE_KEY or other secrets to client.

- Testing section:
  - Updated to reflect current reality:
    - `npm run lint`, `npm run type-check` as primary gates.
    - Jest wired via [`jest.config.cjs`](jest.config.cjs:1) for tests/server.
    - Playwright for E2E via `npm run test:e2e`.
    - Notes that Jest suites are being expanded; scaffolds exist.

Impact:
- New contributors reading README now see:
  - Correct auth story.
  - Correct stack.
  - Correct test commands.
  - No references to non-existent endpoints (vaccinations/health-screening are clearly placeholders in code).

3) AGENT.md — single, authoritative agent brief

Key updates:
- 1) Project overview:
  - Now matches the implemented architecture:
    - Next.js 14.2
    - NextAuth + Prisma as canonical identity
    - Supabase Postgres (no Supabase Auth).
    - tRPC v11, Mantine, Tailwind.
    - Stripe/Twilio/Resend/Daily integrated via wrappers.
    - Strict ESLint/TS and PDPA/MOH emphasis.

- 2) Workspace layout:
  - Updated to actual structure:
    - src/app (layout, page, auth, tRPC route)
    - pages/ for legacy routes and Stripe webhook.
    - lib/trpc, lib/auth, lib/integrations, lib/jobs, lib/supabase, types.
    - database/migrations + seeds.
    - tests/e2e and tests/server.
  - Removes stale references that assumed only Pages Router and a specific supabase-client path.

- 3) Environment:
  - Mirrors README:
    - .env.example -> .env.local.
    - Required Supabase, DB, and NextAuth env.
    - No server secrets on client.
    - Mentions third-party integration keys.

- 5) Architecture & patterns:
  - Strengthened instructions:
    - Controllers thin; logic in services/lib.
    - Supabase strictly DB.
    - NextAuth + Prisma as the only identity.
    - All user-bound records must map to NextAuth/Prisma user id.
    - RLS and least-privilege assumptions.
  - Matches the behavior in:
    - [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
    - [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
    - [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
    - [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)

- 6) Tests, CI & quality gates:
  - Now explicitly:
    - Jest via [`jest.config.cjs`](jest.config.cjs:1) for tests/server.
    - Playwright E2E.
    - CI: lint + type-check + tests.
    - External integrations must be mocked.

- 13) Known unknowns:
  - Updated away from “check supabase-auth setup” toward:
    - Verify env, migrations, test config, and integration mocks.

- 14) Checklist:
  - Marked:
    - Clone, env, and build as done.
  - Lists:
    - Migrations/seeds and Jest coverage as next tasks.

Impact:
- AGENT.md is now a faithful reflection of the running project:
  - An AI or human reading it can correctly:
    - Start dev.
    - Understand auth and DB responsibilities.
    - Follow coding, testing, and PDPA/logging rules.

4) Alignment with recent code changes

The docs now align with these concrete realities:

- Build:
  - `npm run build` passes (lint + type-check included).

- Auth:
  - NextAuth wired via:
    - [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/[...nextauth]/route.ts:1)
    - [`src/server/auth/config.ts`](src/server/auth/config.ts:1)
    - [`src/server/auth/index.ts`](src/server/auth/index.ts:1)

- tRPC:
  - Server:
    - [`src/server/api/trpc.ts`](src/server/api/trpc.ts:1)
    - [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts:1)
  - Routers:
    - [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
    - [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
    - [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
    - [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)
  - Client:
    - [`lib/trpc/client.ts`](lib/trpc/client.ts:1)

- PDPA/logging:
  - Explicit comments and constrained logs in sensitive routers and jobs.
  - Docs now explicitly call out PDPA/no-PHI constraints.

- Placeholder pages:
  - Vaccinations:
    - [`pages/dashboard/vaccinations/index.tsx`](pages/dashboard/vaccinations/index.tsx:1)
    - Documented static placeholder; no invalid tRPC calls.
  - Health screening:
    - [`pages/health-screening/index.tsx`](pages/health-screening/index.tsx:1)
    - Documented static placeholder; no invalid tRPC calls.

Why this completion is solid

- Documentation and implementation are now synchronized:
  - No references to outdated auth model.
  - No promises of endpoints that do not exist without being marked as TODO.
  - Clear, accurate guidance for:
    - Architecture.
    - Environment.
    - Testing.
    - Security and PDPA.
- New contributors and future AI agents can rely on:
  - README.md for high-level orientation and setup.
  - AGENT.md as the precise operational brief.

This completes the requested consolidation and alignment of README.md and AGENT.md with the current, green-build state of the codebase.
