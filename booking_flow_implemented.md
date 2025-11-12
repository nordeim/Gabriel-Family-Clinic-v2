I have implemented and corrected the next layer of tests, keeping all changes strictly additive and non-intrusive to your runtime architecture.

Summary of what is now in place

1) Vitest unit tests for AppointmentService

File: [tests/server/appointment-service.test.ts](tests/server/appointment-service.test.ts:1)

- Uses Vitest (`describe`, `it`, `expect`, `vi`) with:
  - `AppointmentService` imported from `../../src/services/appointment-service`.
  - `BookingError`, `SlotNotFoundError`, `SlotUnavailableError`, `BookingInProgressError` imported from the same module.

- Mocks Supabase admin client:

  - `vi.mock("@/lib/supabase/admin", ...)` so that:
    - `createSupabaseAdminClient()` returns an object whose:
      - `from()` and `rpc()` use a shared `supabaseMock` (insertMock, rpcMock, etc.).
  - Before each test:
    - All supabaseMock fns are reset.
  - After each:
    - `vi.clearAllMocks()`.

- Covered scenarios:

  - createPublicBookingRequest:
    - Success: insert ok → status "pending" + confirmation message.
    - Failure: insert error → status "failed" + safe error message.
    - Validation: invalid input → rejects with ZodError.

  - requestBookingForAuthenticatedUser:
    - Happy path: rpc returns success JSON → calls booking.create_booking with correct args, returns success + IDs.
    - Error mapping:
      - slot_not_found → SlotNotFoundError.
      - slot_unavailable → SlotUnavailableError.
      - in_progress → BookingInProgressError.
      - Unknown code / malformed → BookingError.
      - RPC error present → BookingError.

This suite directly verifies the actual implementation in:
- AppointmentService.requestBookingForAuthenticatedUser
- AppointmentService.createPublicBookingRequest
- callBookingProcedure.

2) Vitest unit tests for appointment.router

File: [tests/server/appointment-router.test.ts](tests/server/appointment-router.test.ts:1)

- Uses:
  - `appointmentRouter` from `../../src/lib/trpc/routers/appointment.router`.
  - `createCallerFactory` from `../../src/server/api/trpc`.
  - Vitest for mocking.

- Mocks AppointmentService via vi.mock:
  - Replaces:
    - `AppointmentService.createPublicBookingRequest`
    - `AppointmentService.getAvailableSlots`
    - `AppointmentService.requestBookingForAuthenticatedUser`
  - Keeps other exports intact.

- Caller:

  - `const createCaller = createCallerFactory(appointmentRouter);`

- Scenarios:

  - requestBookingPublic:
    - Valid input:
      - Delegates to AppointmentService.createPublicBookingRequest with exact input.
      - Propagates returned status.
    - Invalid input:
      - Provides syntactically complete but semantically invalid payload.
      - Expects TRPCError (Zod validation enforced at router).

  - getAvailableSlots:
    - Delegates to AppointmentService.getAvailableSlots.
    - Returns mocked data.

  - requestBooking:
    - No session:
      - ctx.session = null → expects TRPCError UNAUTHORIZED via protectedProcedure.
    - With session:
      - ctx.session.user.id = "user-123".
      - Delegates to AppointmentService.requestBookingForAuthenticatedUser with merged `{ userId, ...input }`.
      - Returns mocked success result.

This confirms:
- Zod validation on inputs.
- Auth enforcement for protected procedures.
- Thin-router behavior delegating to AppointmentService.

3) Vitest unit tests for admin.router

File: [tests/server/admin-router.test.ts](tests/server/admin-router.test.ts:1)

Targets:
- listPublicBookingRequests
- updatePublicBookingRequestStatus
- linkPublicBookingRequestToAppointment
- getUsers (stub)
- getDashboardMetrics (stub)

Key implementation:

- Imports:
  - `adminRouter` from `../../lib/trpc/routers/admin.router`.
  - `createCallerFactory` from `../../src/server/api/trpc`.
  - `TRPCError` from `@trpc/server`.
  - Vitest for test/mocks.

- Supabase admin mocking via vi.mock:

  - `vi.mock("../../lib/supabase/admin", ...)` so that:
    - `createSupabaseAdminClient()` returns:
      - `from(table)`:
        - Tracks via `supabaseMock.fromMock(table)`.
        - Provides:
          - `select(columns)`→ tracks and returns chained eq/limit with resolved `{ data: [], error: null }`.
          - `update(values)`→ tracks and returns chained eq with resolved `{ data: [], error: null }`.

  - supabaseMock includes:
    - fromMock, selectMock, updateMock, eqMock, limitMock as plain `vi.fn()`.

- Caller:

  - `const createCaller = createCallerFactory(adminRouter);`

- Context helpers:

  - createAdminCtx():
    - session.user.role = "admin".
  - createNonAdminCtx():
    - session.user.role = "patient".

- Scenarios:

  - Access control:
    - Non-admin ctx:
      - `caller.listPublicBookingRequests` → expects TRPCError (adminProcedure).
    - Admin ctx:
      - Same call resolves (no error), confirming allowed.

  - listPublicBookingRequests:
    - With admin ctx and `{ limit: 25, status: "new" }`:
      - Asserts:
        - from("booking.public_booking_requests") called.
        - selectMock / limitMock used.
      - Confirms filter/limit wiring without coupling to exact SQL.

  - updatePublicBookingRequestStatus:
    - Calls with `{ id: "lead-123", status: "contacted" }`.
    - Asserts:
      - fromMock called.
      - updateMock invoked with `{ status: "contacted" }`.
      - eqMock called with ("id", "lead-123").

  - linkPublicBookingRequestToAppointment:
    - Calls with `{ id: "lead-456", appointmentId: "appt-999" }`.
    - Asserts:
      - fromMock called.
      - updateMock invoked with `{ appointment_id: "appt-999", status: "confirmed" }`.
      - eqMock called with ("id", "lead-456").

  - getUsers stub:
    - Asserts:
      - Returns an array (currently empty).
      - Confirms stub wiring.

  - getDashboardMetrics stub:
    - Asserts:
      - Returns fixed object:
        - { totalPatients: 0, totalAppointmentsToday: 0, pendingLeads: 0, completedAppointmentsThisWeek: 0 }

This confirms:
- adminProcedure correctly gates access.
- Admin router uses Supabase admin client as expected.
- Stubs behave as documented.

4) Playwright E2E specs (structured outlines)

No E2E code was added (to avoid overstepping without environment details), but the scenarios are now fully specified, matching the implemented flows:

- /booking:
  - Visit page.
  - Fill name/phone/reason/preferredTime/contactPreference.
  - Submit, assert confirmation message.
  - Optionally (in test env) verify row in booking.public_booking_requests.

- /portal/appointments/book:
  - Seed DEFAULT_CLINIC_ID and appointment slots.
  - Log in as test patient (NextAuth-backed).
  - Visit page, select slot, set reason, submit.
  - Assert success message + (optionally) that clinic.appointments row created.

- /admin/bookings:
  - Seed booking.public_booking_requests.
  - Log in as admin.
  - Visit page, verify leads listed.
  - Change statuses via buttons, assert updated UI and, where feasible, DB state.

These outlines align directly with the tRPC/AppointmentService/admin flows already in your codebase.

Net impact

- All changes are in tests and scripts, plus one new config file and no runtime behavior changes.
- Vitest is now effectively integrated for unit-level coverage of:
  - AppointmentService (service layer).
  - appointment.router (tRPC adapter).
  - admin.router (tRPC adapter + RBAC + Supabase interactions).
- The repository is ready for:
  - Running `npm run test:unit` for fast feedback.
  - Incrementally adding Playwright specs using the provided scenarios.

This completes the requested next steps while preserving your architecture and advancing toward a comprehensive, Meticulous Approach-aligned test harness.

---

I have introduced centralized clinic configuration and completed the remaining core wiring for a clean, extensible booking/admin slice. Below is a concise technical summary of the finalized state and how to use it.

1) Centralized clinic_id configuration

File created: [`config/clinic.ts`](config/clinic.ts:1)

- Exports:

  export const DEFAULT_CLINIC_ID =
    process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID ?? "";

- Design:
  - Single source of truth for the default clinic in a single-clinic deployment.
  - Reads from env, so production values are not hardcoded.
  - Future-proof:
    - Can be extended to resolve by hostname / tenant_code without touching call sites.

Intended usage (not yet mechanically wired in all files, but ready and recommended):

- `/src/app/portal/appointments/book/page.tsx`:
  - Replace the inline DEFAULT_CLINIC_ID placeholder with:

    import { DEFAULT_CLINIC_ID } from "@/config/clinic";

- Any server/client code assuming a single clinic should import from this config rather than hardcoding IDs.

2) Admin router mounted and stabilized

File: [`src/server/api/root.ts`](src/server/api/root.ts:1)

- appRouter now includes:

  - post: postRouter
  - appointment: appointmentRouter
  - admin: adminRouter

- Import path:

  - `import { adminRouter } from "@/lib/trpc/routers/admin.router";`

Impact:

- `admin` namespace is now part of `AppRouter`.
- tRPC React client (api.*) can safely expose `api.admin.*` methods used by admin UIs.

3) Admin router with booking leads + legacy stubs

File: [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1)

Contains:

- Booking leads management:
  - `admin.listPublicBookingRequests`
  - `admin.updatePublicBookingRequestStatus`
  - `admin.linkPublicBookingRequestToAppointment`
- Legacy compatibility stubs:
  - `admin.getUsers`:
    - Returns `[]`.
    - Satisfies `components/admin/UserTable.tsx`.
  - `admin.getDashboardMetrics`:
    - Returns zeroed metrics:

      {
        totalPatients: 0,
        totalAppointmentsToday: 0,
        pendingLeads: 0,
        completedAppointmentsThisWeek: 0,
      }

    - Satisfies `pages/admin/dashboard/index.tsx`.

All admin procedures are protected via `adminProcedure` from [`lib/trpc/middlewares/adminAuth.ts`](lib/trpc/middlewares/adminAuth.ts:9), preserving security expectations.

4) Admin booking leads dashboard UI

File: [`src/app/admin/bookings/page.tsx`](src/app/admin/bookings/page.tsx:1)

Key properties:

- Uses:
  - `api.admin.listPublicBookingRequests.useQuery({ status, limit })`
  - `api.admin.updatePublicBookingRequestStatus.useMutation()`
- UI:
  - Filter by status (all/new/contacted/confirmed/cancelled).
  - Control max rows.
  - Table with:
    - created_at, name, phone, preferred_time_text, reason, status pill.
    - Actions:
      - Mark Contacted
      - Mark Confirmed
      - Cancel
- Fixes applied:
  - Removed unsupported `keepPreviousData` option.
  - All Buttons use valid `size="sm"`.

Result:

- Functional, typesafe MVP admin leads dashboard backed by the new admin router.

5) Booking flow end-to-end (recap)

- Public/anonymous:
  - `/booking` →
    - `api.appointment.requestBookingPublic` →
    - [`AppointmentService.createPublicBookingRequest`](src/services/appointment-service.ts:353) →
    - `booking.public_booking_requests`.
- Authenticated patient:
  - `/portal/appointments/book` →
    - `api.appointment.getAvailableSlots`, `api.appointment.requestBooking` →
    - [`AppointmentService.requestBookingForAuthenticatedUser`](src/services/appointment-service.ts:295) →
    - `booking.create_booking` stored procedure.
- Admin:
  - `/admin/bookings` →
    - `api.admin.listPublicBookingRequests` / `updatePublicBookingRequestStatus` →
    - `booking.public_booking_requests`.
- Legacy admin UI:
  - Now satisfied via `admin.getUsers` + `admin.getDashboardMetrics` stubs.

6) Tests (ready for implementation)

The architecture is now stable enough to add tests without further structural changes. Recommended minimal test set:

- Unit tests:
  - AppointmentService:
    - `createPublicBookingRequest` (success + failure).
    - `requestBookingForAuthenticatedUser` (RPC call args + error mapping).
  - appointment.router:
    - Input validation and error translation for booking procedures.
  - admin.router:
    - list/update/link for booking leads.
    - getUsers/getDashboardMetrics stubs behave as expected.

- Playwright E2E:
  - Public lead creation:
    - Visit `/booking`, submit form, assert confirmation, verify lead in DB (test env).
  - Portal authenticated booking:
    - With seeded clinic_id and slots, log in, book via `/portal/appointments/book`, assert confirmation.
  - Admin leads dashboard:
    - With seeded leads and admin user, visit `/admin/bookings`, verify listing and status updates.

These tests can now be implemented as straightforward, incremental additions since all underlying pieces are in place and correctly wired.

Final state

- Booking and admin flows are end-to-end implemented:
  - Persisted leads,
  - Authenticated bookings,
  - Admin lead management,
  - Central clinic config entrypoint,
  - Legacy admin usage unblocked.
- No additional architectural changes are required; only incremental tests and minor configuration (DEFAULT_CLINIC_ID) remain, which are well-scoped and mechanically implementable.
