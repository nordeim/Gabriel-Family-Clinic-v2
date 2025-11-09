## Latest Next.js build failure — review and implementation plan

Date: 2025-11-09

Summary
-------
This document records a meticulous review of the latest `next build` failure (attached `error.txt`) and proposes a careful, low-risk implementation plan to get the project to a clean production build. I created this file during the troubleshooting session so the analysis and plan are preserved in the repo under `docs/troubleshooting/`.

Errors & warnings observed (from `error.txt`)
------------------------------------------------
- Multiple ESLint `no-unused-vars` warnings (repo rule: allowed unused names must match `/^_/u`):
  - `pages/dashboard/vaccinations/index.tsx` — `records`, `isLoading`
  - `pages/doctor/consultations/[appointmentId].tsx` — `appointmentId`
  - `pages/doctor/patients/[patientId]/history.tsx` — `data`
  - `pages/health-screening/index.tsx` — `packages`, `isLoading`
  - `components/doctor/TodaySchedule.tsx` — `cn`
  - `components/payment/CheckoutForm.tsx` — `useState`
  - `lib/auth/actions.ts` — `nric`
  - several router/handler files (`consultation.router.ts`, `health.router.ts`, `patient.router.ts`, etc.) report unused args or vars.

- `@typescript-eslint/consistent-type-imports` warnings (imports used only as types):
  - `lib/auth/AuthContext.tsx`
  - `lib/integrations/resend.ts`
  - `lib/jobs/queue.ts`
  - `lib/notifications/types.ts`

- `import/no-anonymous-default-export` warning:
  - `lib/jobs/types.ts` (default export is an anonymous object)

- Blocking ESLint error (build fails):
  - `src/app/api/auth/[...nextauth]/route.ts` — `Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any`

Primary blocking issue (root cause)
----------------------------------
The build fails because ESLint is run during `next build`, and one or more ESLint rules are flagged as errors. The single explicit error reported in the build output is the `no-explicit-any` violation in the NextAuth API route (`src/app/api/auth/[...nextauth]/route.ts`).

There is also a critical runtime failure previously observed during the build/page-collection stage where code attempted to destructure `handlers` from an imported server export that was undefined. A prior mitigation changed the API route to construct the NextAuth handler directly (i.e., call `NextAuth(authConfig)`) to avoid destructuring undefined `handlers`. That change reduced the runtime failure risk but left an `any` cast (`as any`) in place — which is now causing the build to fail due to ESLint rules.

Goals for fix
-------------
1. Remove the `any` usage in `src/app/api/auth/[...nextauth]/route.ts` and correctly type the NextAuth handler and exported methods (GET/POST) so that no ESLint `no-explicit-any` errors remain.
2. Resolve the non-blocking but lint-failing warnings: convert type-only imports to `import type`, replace anonymous default export in `lib/jobs/types.ts`, and fix/underscore prefix or remove unused vars to satisfy the repo ESLint rules.
3. Iterate builds: run `type-check` → `lint` → `next build` and iterate until green.

Safety & constraints
--------------------
- Make minimal, focused edits so runtime behavior is unchanged.
- Avoid introducing broad ESLint rule disables. Prefer local, minimally-scoped fixes.
- Keep changes reversible and small. When uncertain about types from external libs (NextAuth, Supabase), prefer `unknown` + runtime guards over `any`.

Detailed per-file recommendations (what to change and why)
--------------------------------------------------------
1. `src/app/api/auth/[...nextauth]/route.ts`
   - Problem: currently casting NextAuth handler with `as any` (triggers ESLint error). The route must export `GET` and `POST` handlers for Next.js.
   - Fix: import `NextAuth` (server) and `NextAuthOptions` type; import `authConfig` from `src/server/auth/config`; call `const handler = NextAuth(authConfig as NextAuthOptions);` — but avoid `as` if `authConfig` is already typed. Better: ensure `authConfig` is exported from `src/server/auth/config` as `NextAuthOptions` (or a properly typed value). Then do `const handler = NextAuth(authConfig);` and export `export const { GET, POST } = handler;` with no `any` cast. If `authConfig` can't be typed easily, use `const handler = NextAuth(authConfig as unknown as NextAuthOptions);` as a last resort and then follow up by typing `authConfig` properly.
   - Additional check: avoid destructuring from an import that could be undefined. Construct the handler in-place in the route file as above.

2. `lib/auth/AuthContext.tsx`, `lib/integrations/resend.ts`, `lib/jobs/queue.ts`, `lib/notifications/types.ts`
   - Problem: imports are only used as types. ESLint requires `import type` when used purely for types.
   - Fix: change `import { X } from '...'` to `import type { X } from '...';` for the relevant imports.

3. `lib/jobs/types.ts`
   - Problem: anonymous default export triggers `import/no-anonymous-default-export`.
   - Fix: replace `export default { ... }` with `export const JobTypes = { ... }` and update any imports that consume the default export. If many imports expect default, create `export default JobTypes;` and also a named export, then later standardize — but prefer named export now.

4. Files with unused vars (many pages and components)
   - Problem: `@typescript-eslint/no-unused-vars` rejects unused local variables unless they are prefixed with `_`.
   - Fix: For variables intentionally unused (e.g., `isLoading` or `data` placeholders) rename to `_isLoading` or `_data`. If variables are truly unnecessary, remove them. If the variable will be used soon, prefer `_`-prefixed name so lint passes and intent is visible.

5. `lib/trpc/context.ts`, `lib/trpc/root.ts`, routers with unused `ctx` args
   - Problem: unused function params flagged by lint.
   - Fix: rename to `_ctx` to indicate intentionally unused; or prefix individual args with `_` per rule.

6. Re-run checks and iterate.

Implementation plan (step-by-step)
---------------------------------
Phase A — Validate & small non-invasive fixes (low risk)

1) Verify current `authConfig` type:
   - Open `src/server/auth/config.ts` and confirm it exports `authConfig` typed as `NextAuthOptions` (or equivalent). If not, add/adjust type annotation.

2) Edit `src/app/api/auth/[...nextauth]/route.ts` (single file change):
   - Ensure imports:
     - `import NextAuth from 'next-auth/next';`
     - `import type { NextAuthOptions } from 'next-auth';`
     - `import { authConfig } from '~/server/auth/config';` (prefer named export with proper typing)
   - Construct the handler safely: `const handler = NextAuth(authConfig as NextAuthOptions);` only if `authConfig` is not typed; otherwise omit the cast.
   - Export `export const { GET, POST } = handler;`
   - Remove any `as any` casts.

3) Run quick local checks:
   - `npm run -s type-check` (fix any TypeScript errors from the change)

Phase B — Lint cleanups (medium effort)

4) Convert type-only imports to `import type` in each flagged file.

5) Replace anonymous default export in `lib/jobs/types.ts` with a named export `JobTypes`. Update imports if necessary.

6) Fix unused var warnings across pages/components:
   - Where variables are intentionally unused, prefix with `_` (e.g., `_isLoading`).
   - Where variables are unnecessary, remove them.

7) Rename unused args to `_argName` in trpc context/routers where appropriate.

8) Re-run lint and type-check: `npm run -s lint` and `npm run -s type-check`. Fix any remaining issues.

Phase C — Verify build and follow-ups

9) Run `npm run build` (Next.js production build). Observe results.

10) If other runtime errors appear (e.g., destructuring of undefined exports), inspect built bundles to find the offending code and adjust import/export patterns to avoid destructuring unknown module values at build-time.

11) Prepare a small PR with the changes and include the following in PR body:
    - What was fixed (list of files and changes)
    - How it was validated (`type-check`, `lint`, `next build` results)
    - Follow-ups (improve `authConfig` typing if cast was used, standardize job types export, add CI lint gating if not in place).

Testing and validation
----------------------
- After each file edit, run `npm run -s type-check` then `npm run -s lint`. Fix issues until both are clean. Finally run `npm run build`. Expect iteration.
- For the NextAuth route change, test locally that authentication flows still work in development: hit the authentication endpoints (sign-in, callback) to ensure no runtime regressions.

Rollback plan
-------------
- Keep changes small and isolated per file. If a change causes regression, revert the single file or use Git branch/PR to control the scope.

Assumptions
-----------
- `authConfig` is exported from `src/server/auth/config.ts` and can be typed with `NextAuthOptions`. If not, we'll add the type there.
- No other file in the repo relies on anonymous default export from `lib/jobs/types.ts` heavily; if they do, we will temporarily export both default and named until imports are updated.

Files to create/edit (high-level)
--------------------------------
- Edit: `src/app/api/auth/[...nextauth]/route.ts`
- Edit: `src/server/auth/config.ts` (if needed to add/adjust typing for `authConfig`)
- Edit: `lib/auth/AuthContext.tsx`, `lib/integrations/resend.ts`, `lib/jobs/queue.ts`, `lib/notifications/types.ts` (switch to `import type`)
- Edit: `lib/jobs/types.ts` (named export)
- Edit: various pages/components to prefix unused variables with `_` or remove them.

Next steps (immediate, after saving this doc)
-------------------------------------------
1. Implement the typed NextAuth handler change in `src/app/api/auth/[...nextauth]/route.ts` (non-invasive, single-file change). Run `npm run -s type-check`.
2. Convert the type-only imports. Run linter and fix issues.
3. Fix unused variables across pages. Run linter and type-check.
4. Run `npm run build` and iterate until green.

Status: this document was created and saved to the repository at `docs/troubleshooting/latest-build-error-review.md` as part of the troubleshooting session.

If you want, I can now proceed to implement Phase A (edit the NextAuth route and ensure `authConfig` is typed) and run the type-check/lint/build iteration. Confirm and I'll apply changes one-by-one and run the checks.

— end of document

Actions performed since initial analysis
---------------------------------------
- Implemented Phase A change: removed `as any` from `src/app/api/auth/[...nextauth]/route.ts` and relied on the typed `authConfig` exported from `src/server/auth/config.ts`.
- Added minimal redirecting components to satisfy Next.js page exports:
   - `pages/admin/login.tsx` → redirect to `/login`
   - `pages/doctor/login.tsx` → redirect to `/login`
- Converted type-only imports to `import type` in:
   - `lib/auth/AuthContext.tsx`
   - `lib/integrations/resend.ts`
   - `lib/jobs/queue.ts`
   - `lib/notifications/types.ts`
- Removed an anonymous default export from `lib/jobs/types.ts` (left only the exported types).

Validation results
------------------
- After the above edits I ran `next build`. The build now completes successfully.
- Remaining lint warnings reported during the build (non-blocking):
   - Multiple `@typescript-eslint/no-unused-vars` warnings across pages and routers. These should be resolved by prefixing intentional unused variables with `_` or removing them.
   - One `import/no-anonymous-default-export` was addressed.
   - Several `consistent-type-imports` warnings were addressed.

Next recommended steps (Phase B)
--------------------------------
1. Fix unused variable warnings (rename to `_`-prefixed names or remove unused bindings) in the pages and routers listed in the original `error.txt`.
2. Re-run `npm run -s lint` and `npm run -s type-check` locally and fix any remaining issues.
3. Prepare a small PR with the changes and document any follow-ups (improving auth typing, standardizing job types, etc.).

If you want, I'll proceed now with Phase B and systematically fix the unused variable warnings in the pages and router files shown in `error.txt`. I can do them in small batches (e.g., pages first, then routers) and re-run the build after each batch to verify.
