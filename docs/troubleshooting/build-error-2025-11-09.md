## Build failure triage — 2025-11-09

This document records a meticulous review and remediation plan for the Next.js build failure observed on 2025-11-09 while building the `Gabriel-Family-Clinic-v2` repository.

Summary of observed symptoms
- Command: `npm run build` (Next.js 14.2.33)
- Build initially compiled but then failed at the "Linting and checking validity of types" stage.
- The active, build-stopping error list at the time of capture included a single blocking ESLint/TypeScript error and a set of warnings:
  - Error (blocking):
    - ./components/telemedicine/VideoCall.tsx
      - 37:118 Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
  - Warnings (non-blocking but required to clean up):
    - Several files show `@typescript-eslint/no-unused-vars` warnings (unused variables such as `records`, `isLoading`, `appointmentId`, `data`, `packages`, etc.)
    - Multiple files show `@typescript-eslint/consistent-type-imports` suggestions (imports that are type-only should use `import type`).
    - React `react/no-unescaped-entities` warnings were previously observed and mitigated in a small set of files.

Root-cause hypothesis
- The immediate build blocker is the `no-explicit-any` rule being triggered by an `any` usage in `VideoCall.tsx` (line ~37). Next.js's build is configured to run ESLint/type-check as part of the production build and treats the error as fatal.
- Multiple other files suffer from type/import/style issues that either already appeared or will appear after we fix the current blocker. These include improper handling of Supabase select shapes (nested arrays vs objects), type-only imports not using `import type`, and unused vars caused by skeleton/placeholder code.

Principles for fixes (meticulous & minimal risk)
- Prefer concrete typing over `any`. If the upstream library lacks types for a shape, use `unknown` + narrow with type guards and explicit local interfaces.
- Favor small, behavior-preserving changes. Where an API contract mismatch exists (server returns `totalCount` but UI expects `total`) prefer the smallest safe change to restore parity and add a follow-up TODO to harmonize names.
- Fix lint errors that block CI/build first (errors), then address warnings in a follow-up batch.
- Keep changes localized and well-documented in commit messages and the PR description.

High-level remediation plan (phases)

Phase 0 — Save knowledge and create this troubleshooting doc
- (Done) This file is saved under `docs/troubleshooting/build-error-2025-11-09.md`.

Phase 1 — Fix the blocking `no-explicit-any` in `VideoCall.tsx`
1. Replace value-style type-only imports with `import type` when the symbol is used only as a type. Example:
   - `import DailyIframe, { DailyCall } from "@daily-co/daily-js";`
   - -> `import DailyIframe from "@daily-co/daily-js"; import type { DailyCall } from "@daily-co/daily-js";`
2. Remove `any` usage in the Daily event error handler. Replace with `unknown` and a type guard that extracts a message safely without `any`.
   - Use a small, local type guard like:
     ```ts
     function extractErrorMessage(e: unknown): string {
       if (e instanceof Error) return e.message;
       if (typeof e === 'object' && e !== null && 'errorMsg' in e) {
         const v = (e as { errorMsg?: unknown }).errorMsg;
         return typeof v === 'string' ? v: String(v);
       }
       return String(e);
     }
     ```
3. Ensure `callFrameRef` uses a typed ref: `useRef<DailyCall | null>(null)` (already present) and that no `any` is used elsewhere.

Phase 2 — Re-run build and capture remaining failures
- Run `npm run build` to surface the next prioritized errors/warnings.
- Categorize output into: blocking errors, high-priority warnings (must fix before PR), and low-priority warnings (can be deferred).

Phase 3 — Fix other blocking errors discovered on re-run
- Likely items (observed earlier) include:
  - `no-explicit-any` occurrences in other files (`lib/jobs/queue.ts`, trpc routers). Fix using `unknown` + extraction or narrow types.
  - Type mismatches between server responses and frontend consumers (example: `totalCount` vs `total`). Small server-side compatibility changes are acceptable if they are backwards-compatible; otherwise update the consumer.
  - Import casing mismatches (Badge component) — on case-sensitive systems this causes runtime/type errors. Normalize filename casing or import path.

Phase 4 — Fix warnings and apply niceties
- Replace type-only imports with `import type` across the files flagged.
- Prefix intentionally-unused variables with `_` or remove them; or add TODOs where placeholders remain.
- Fix React hook dependency warnings (either include the dependency or refactor effect to avoid stale closure).

Phase 5 — Run full validation & create PR
- Commands to run locally (recommended sequence):
  - npm ci
  - npm run type-check
  - npm run lint
  - npm run build
  - npm test
- When green, prepare a feature branch and PR containing grouped, logical commits:
  - `fix(trpc): export t from server` (already done)
  - `fix(types): replace explicit any with unknown and safe guards` (several small commits)
  - `fix(api): align admin.getUsers response key with front-end expectation (total)` or alternatively update the front-end to use `totalCount` consistently
  - `chore(lint): convert type-only imports to import type`

Step-by-step safe implementation steps (detailed)
1. Fix `VideoCall.tsx` (blocking)
   - Update imports to use `import type` for `DailyCall`.
   - Replace handler `e: any` with `e: unknown` and add `extractErrorMessage` helper.
   - Local test: run `npm run type-check` and `npm run lint`.

2. Re-run build: `npm run build`.

3. Triage next errors from build output.
   - If another `no-explicit-any` error appears, fix it using the same pattern: prefer `unknown` + guard or define a narrow interface.
   - If a type mismatch between server & client appears, change the smaller surface area (server response or client read) to be consistent. Document the decision and add a follow-up issue to align naming.

4. Fix consistent-type-imports warnings (batch):
   - Replace imports like `import { ReactNode } from 'react'` with `import type { ReactNode } from 'react'` where the import is used only in type position.

5. Fix unused variables: either remove, use `_`-prefix, or implement missing logic.

6. Re-run full suite: type-check, lint, build, tests.

7. Prepare PR, including:
   - Clear description of each change and why (link to this doc)
   - A list of files changed and the validation steps executed
   - Notes about any deferred work (e.g., full Supabase response typing)

Risk analysis and mitigations
- Risk: Changing server response keys (`totalCount` -> `total`) could break other consumers.
  - Mitigation: prefer to return both keys for a transitional period or change only the smaller consumer. Add a TODO to harmonize.
- Risk: Overusing `any` to silence lint will reduce type-safety.
  - Mitigation: Avoid `any`; use `unknown` + guards or narrow interfaces. If `any` is unavoidable, add inline comment explaining and a follow-up ticket to improve typing.
- Risk: Fixing many files in a single PR increases review time and risk of regressions.
  - Mitigation: Keep PRs small and group related fixes (e.g., all `no-explicit-any` patches in one PR, lint-only changes in another).

Estimated effort
- Blocking `VideoCall` fix: ~15–30 minutes.
- Next-pass fixes (3–6 other blocking/type errors): 1–3 hours depending on complexity.
- Full cleanup of all warnings and consistent-type-imports: 2–6 hours.

Validation checklist (before merging PR)
- [ ] Type-check (no TypeScript errors)
- [ ] ESLint (no errors; zero or accepted warnings)
- [ ] Build (`npm run build` completes)
- [ ] Run unit tests (if present) or at least run `npm test` and fix obvious failures
- [ ] Manual smoke test: start dev server and visit key pages where changed code runs (VideoCall component, Admin user list, etc.)

Files to create/edit (minimal target set for first PR)
- `components/telemedicine/VideoCall.tsx` — fix explicit any and use `import type`
- files with `catch (e: any)` patterns — replace with `unknown` + extraction helper
- optionally `lib/trpc/routers/admin.router.ts` — keep `total`/`totalCount` compatibility depending on decision

Follow-ups (post-PR)
- Full Supabase response typings and repository-layer types to eliminate implicit `any`s and indexing errors.
- Consider adding a lightweight pre-commit hook to run `npm run lint -- --max-warnings=0` to prevent regressions.

Next action I propose
- I will implement Phase 1 (fix `VideoCall.tsx`) and then run `npm run build` to capture the next set of blockers. This is low-risk and directly addresses the current blocking error. If you approve, I will commit the minimal fix and re-run the build, then update this doc with the updated build output and next steps.

Approved-by: developer (please reply with `Proceed` to authorize me to implement Phase 1 now)

Timestamp: 2025-11-09T00:00:00Z
