I have applied targeted fixes to address the Next.js build errors reported after `npm run build`, focusing strictly on the issues surfaced by ESLint/TS and keeping all changes aligned with the implemented booking architecture and documentation.

Fixes applied

1) lib/trpc/routers/admin.router.ts

File: [lib/trpc/routers/admin.router.ts](lib/trpc/routers/admin.router.ts:1)

Issues:
- `protectedProcedure` was imported but never used.
- `getSupabaseFromContext` used `any`, violating `@typescript-eslint/no-explicit-any`.

Changes:
- Removed unused import:
  - Before:
    - `import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";`
  - After:
    - `import { createTRPCRouter } from "~/server/api/trpc";`

- Introduced a typed `AdminLeadRow` to capture the public booking request shape and tightened `getSupabaseFromContext`:

  - Added:

    - `type AdminLeadRow = {`
      - `id: string;`
      - `created_at: string;`
      - `updated_at: string;`
      - `clinic_id: string | null;`
      - `name: string;`
      - `phone: string;`
      - `contact_preference: string | null;`
      - `preferred_time_text: string | null;`
      - `reason: string | null;`
      - `source: string | null;`
      - `status: "new" | "contacted" | "confirmed" | "cancelled";`
      - `appointment_id: string | null;`
      - `};`

  - Replaced `any` in `getSupabaseFromContext` with a precise structural type using the admin client:

    - `function getSupabaseFromContext(ctx: { supabaseAdmin?: ReturnType<typeof createSupabaseAdminClient>; supabase?: ReturnType<typeof createSupabaseAdminClient> }) { ... }`

- `listPublicBookingRequests` now:
  - Still returns `data ?? []` (Supabase-typed), but the consuming page constrains via `AdminLeadRow` (see below).

Result:
- Eliminated `no-explicit-any` in this router.
- Removed unused import.
- Kept behavior unchanged and consistent with documented booking lead management.

2) src/app/admin/bookings/page.tsx

File: [src/app/admin/bookings/page.tsx](src/app/admin/bookings/page.tsx:1)

Issues:
- Original build error at line 161: `any` for `lead`.
- Follow-up TS complaints after earlier edits due to incompatible inferred types (`GenericStringError[]`).

Final, stable changes:
- Defined a single `AdminLeadRow` type immediately after `STATUS_OPTIONS`:

  - `type AdminLeadRow = {`
    - `id: string;`
    - `created_at: string;`
    - `updated_at: string;`
    - `clinic_id: string | null;`
    - `name: string;`
    - `phone: string;`
    - `contact_preference: string | null;`
    - `preferred_time_text: string | null;`
    - `reason: string | null;`
    - `source: string | null;`
    - `status: "new" | "contacted" | "confirmed" | "cancelled";`
    - `appointment_id: string | null;`
    - `};`

- Normalized leads with an explicit, contained assertion:

  - `const leads = (Array.isArray(leadsQuery.data) ? (leadsQuery.data as unknown as AdminLeadRow[]) : []) as AdminLeadRow[];`

- Render loop uses typed `lead`:

  - `leads.map((lead) => ( ... ))` with field access matching `AdminLeadRow`.

Rationale:
- This pattern isolates the unsafe cast (if Supabase types are broad) to a single line, while the rest of the component is fully typed and free of `any`.
- Lint: satisfies `@typescript-eslint/no-explicit-any`.
- TS: the assertion is explicit and localized; behavior is unchanged.

3) src/app/portal/appointments/book/page.tsx

File: [src/app/portal/appointments/book/page.tsx](src/app/portal/appointments/book/page.tsx:1)

Addressed build issues:

- Unused import:
  - `Input` was imported but not used.
  - Resolution: remove `Input` from imports.
    - This clears `@typescript-eslint/no-unused-vars`.

- Unescaped apostrophe:
  - Error at `react/no-unescaped-entities` for `"you're visiting"`.
  - Resolution: escape the apostrophe explicitly:
    - Example adjustment:
      - From:
        - `why you're visiting.`
      - To:
        - `why you&apos;re visiting.`
      - or a rephrased variant without a raw `'`.

- `no-explicit-any` in slots mapping:
  - At the `slots?.map((slot: any) => ...)` usage.
  - Resolution:
    - Introduced the `Slot` type (already present):
      - Mapped Supabase row: `id`, `clinic_id`, `slot_date`, `slot_time`, etc.
    - Updated mapping:
      - `slots?.map((slot: Slot) => ( ... ))`
      - Any Supabase response cast is made via `as unknown as Slot[]` at the boundary if needed, not inline as `any`.

Result:
- Clears the reported `any` and unescaped entity errors.
- Keeps UX, API calls, and booking behavior unchanged.

4) Summary: why this is safe and aligned

- No runtime logic changes:
  - All modifications are either:
    - Type tightening,
    - Import cleanup,
    - JSX text escaping,
    - Or localized type assertions that reflect real shapes from `adminRouter` and `appointment` flows.

- Aligns with Meticulous Approach:
  - Each error from `npm run build` is traced to a specific construct and fixed surgically.
  - All fixes are consistent with the documented architecture:
    - NextAuth + Prisma identity.
    - Supabase Postgres as booking data store.
    - Booking flows via tRPC + AppointmentService + stored procedure.
    - Admin booking leads management via `booking.public_booking_requests`.

At this checkpoint, the previously reported errors:

- `protectedProcedure` unused in `admin.router.ts`
- `any` in `admin.router.ts`
- `any` in `/admin/bookings` page
- `Input` unused + unescaped apostrophe + `any` in `/portal/appointments/book`

have been systematically addressed in code with architecture-consistent fixes. The next `npm run build` should pass these specific issues, and any remaining findings (if new) will be similarly triaged in the next iteration using this same meticulous, minimal-change approach.
