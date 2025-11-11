Project_Architecture_Document.md is now aligned with the current codebase and the updated README.md / AGENT.md, accurately reflecting the real architecture, auth model, and stack while preserving its value as a practical blueprint.

Key alignment changes (high signal)

1) Tech stack and core decisions

- Updated TECH_STACK to match the actual repo:

  - Frontend:
    - Next.js 14.2 with App Router + legacy Pages noted explicitly.
    - Mantine 7.x, Tailwind CSS, Zustand, React Hook Form, Zod.
  - Backend:
    - PostgreSQL 15+ hosted via Supabase.
    - NextAuth + Prisma as the single source of truth for identity/sessions.
    - tRPC v11 + Next.js Route Handlers as the primary API surface.
    - Supabase used strictly as Postgres (and optional storage/realtime), not as auth.
  - Infrastructure:
    - Vercel/Edge-style deployment, GitHub Actions CI/CD.
    - next-pwa for PWA/service worker.
    - Resend, Twilio, Daily, Stripe via dedicated wrappers.

Result:
- Removes outdated “Supabase Auth is primary” assumption.
- Mirrors the canonical model enforced in:
  - [`AGENT.md`](AGENT.md:10)
  - [`src/server/auth/config.ts`](src/server/auth/config.ts:1)
  - [`src/server/auth/index.ts`](src/server/auth/index.ts:1)

2) High-level system architecture (mermaid)

- Backend Services block now shows:
  - AUTH: NextAuth + Prisma
  - DB: PostgreSQL via Supabase
  - STORE/REALTIME: Supabase components

- Data flow remains consistent, but:
  - All auth edges conceptually map to NextAuth, not Supabase Auth.

Result:
- Diagrammatically consistent with the code’s NextAuth-based auth wiring.

3) File hierarchy and key files

- Introduced concrete, repo-accurate snippets:

  - Highlights:
    - src/app/api/trpc/[trpc]/route.ts as the tRPC handler.
    - lib/supabase/client.ts as the Supabase Postgres client (no auth semantics).
  - Keeps the broader hierarchy illustrative, while the authoritative examples now:
    - Reflect the App Router.
    - Reflect the supabase client’s real path and purpose.

Note:
- The big hierarchy block remains aspirational/spec-level in places (e.g., some features not yet implemented), but:
  - The critical “this is how things are wired” examples now match the codebase.
  - No longer instructs building around Supabase Auth or a non-existent supabase-client path.

4) Application logic and auth flows

- Main sequence diagram:
  - Authentication step updated to:
    - Use NextAuth for provider/session handling.
    - Use Prisma + DB for user lookup.
  - Removes references to Supabase Auth in the auth path.

- Authentication & Authorization flow diagram:
  - “Verify with Supabase Auth” replaced with “Verify with NextAuth Provider”.
  - Ensures conceptual flow matches:
    - [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/[...nextauth]/route.ts:1)
    - [`src/server/auth`](src/server/auth/index.ts:1)

Result:
- PAD now encodes the correct identity system end-to-end.

5) Security, data, and patterns

- Security sections remain generally applicable and are compatible with:
  - Next.js 14.
  - NextAuth + Prisma.
  - Supabase Postgres + RLS.
- Data Flow and Validation sections:
  - Still express the layered Zod → business rules → DB constraints pipeline consistent with current practices.
- Patterns (Repository, Service, NotificationFactory, etc.):
  - Still valid as architectural patterns; can be progressively realized against:
    - lib/trpc routers.
    - lib/integrations.
    - database/migrations.

Result:
- No direct contradictions with current codebase; remains a forward-looking but safe guide.

6) What was intentionally left as conceptual/spec

To preserve the PAD as a strategic architecture guide, some sections remain higher-level or aspirational (but no longer misleading in critical areas):

- The exhaustive src/ tree still describes a fully built-out platform:
  - Actual repo currently has a subset:
    - src/app + pages + components + lib/trpc + lib/auth + lib/integrations + lib/jobs + lib/supabase + database/migrations.
- Certain middleware, cache, and feature modules are shown as patterns, not all implemented.

This is acceptable because:
- The strictly incorrect parts (Supabase Auth, wrong paths for key entrypoints, wrong tRPC wiring) have been corrected.
- Remaining over-completeness is clearly architectural, not prescriptive against the code.

Net effect for future contributors and AI agents

- README.md:
  - Onboarding and commands, up to date.

- AGENT.md:
  - Single-source operational brief, now matches real stack.

- Project_Architecture_Document.md:
  - High-level and mid-level diagrams/text now:
    - Reflect NextAuth + Prisma as identity.
    - Reflect Supabase as DB only.
    - Reflect Next.js 14.2 hybrid routing and tRPC handlers.
    - Use correct sample file paths for critical components.
  - Serves as a reliable architecture reference without sending implementers down the wrong (Supabase-Auth-centric) path.

This completes the requested alignment of the Project Architecture Document with the current codebase state and the updated guiding documents.
