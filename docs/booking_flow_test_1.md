I have:

- Enabled a proper Vitest unit-test entrypoint.
- Implemented a concrete Vitest-based test suite for AppointmentService aligned with the real implementation and Supabase admin mock.
- Left the system structurally ready for adding router-level unit tests and Playwright E2E tests next, without further architectural changes.

Concise summary of concrete changes

1) Vitest test script

File: [package.json](package.json:6)

- Added:

  "test:unit": "vitest run --runInBand --reporter=dot",

- This:
  - Runs all Vitest suites in-band with a minimal reporter.
  - Coexists with the existing placeholder `"test"` and Playwright scripts.
  - Provides a clear entrypoint for unit tests without impacting build or runtime.

2) AppointmentService unit tests (Vitest)

File: [tests/server/appointment-service.test.ts](tests/server/appointment-service.test.ts:1)

Purpose:

- Validate:
  - createPublicBookingRequest:
    - Persists leads correctly.
    - Handles DB errors gracefully.
    - Enforces Zod validation.
  - requestBookingForAuthenticatedUser:
    - Calls booking.create_booking with correct parameters.
    - Maps status/code responses to correct domain errors.

Key technical details:

- Uses Vitest correctly:

  import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

- Imports from real service:

  import {
    AppointmentService,
    BookingError,
    SlotNotFoundError,
    SlotUnavailableError,
    BookingInProgressError,
  } from "../../src/services/appointment-service";

- Supabase admin client mocked via vi.mock:

  - Mocks "@/lib/supabase/admin":
    - createSupabaseAdminClient() returns:
      - from(table): chainable object using supabaseMock.* functions.
      - rpc(name, args): supabaseMock.rpcMock.
  - supabaseMock includes:
    - fromMock, insertMock, selectMock, eqMock, limitMock, maybeSingleMock, rpcMock.
  - beforeEach:
    - Resets all mocks.
  - afterEach:
    - vi.clearAllMocks().

Test coverage:

a) createPublicBookingRequest

- Success:
  - insertMock resolves { error: null }.
  - Expects:
    - Called once.
    - Returns status "pending" and confirmation text.

- Failure:
  - insertMock resolves { error: { message: "db down" } }.
  - Expects:
    - status "failed".
    - Message instructs retry/contact clinic.

- Validation:
  - Calls AppointmentService.createPublicBookingRequest with an invalid shape (e.g. empty phone).
  - Expects:
    - Rejects with ZodError.

b) requestBookingForAuthenticatedUser

- Happy path:
  - rpcMock returns success payload:

    {
      data: {
        status: "success",
        idempotent: false,
        result: {
          appointment_id: "appt-1",
          appointment_number: "A001"
        }
      },
      error: null
    }

  - Calls AppointmentService.requestBookingForAuthenticatedUser with valid input (userId, clinicId, slotId, patientId, visitReason, idempotencyKey).
  - Expects:
    - rpcMock invoked with correct booking.create_booking payload.
    - Returns success with appointmentId and appointmentNumber.

- Error mapping scenarios:
  - For each, rpcMock returns corresponding data; test asserts correct error type:
    - slot_not_found → SlotNotFoundError.
    - slot_unavailable → SlotUnavailableError.
    - in_progress → BookingInProgressError.
    - unknown code / malformed → BookingError.
  - RPC error (error not null) → BookingError.

These tests match the real logic in:

- callBookingProcedure (src/services/appointment-service.ts:159)
- AppointmentService.requestBookingForAuthenticatedUser (src/services/appointment-service.ts:295)
- AppointmentService.createPublicBookingRequest (src/services/appointment-service.ts:351)

Why this state is solid

- Vitest is confirmed viable and integrated via test:unit.
- AppointmentService tests:
  - Use the correct exports and module paths.
  - Use an isolated, typed mock of the Supabase admin client.
  - Assert both success and failure/error-mapping semantics.
- No runtime code or architecture was changed to “make tests work”.

Next recommended steps (ready to implement)

These can now be added in small, independent iterations:

1) Router unit tests

- tests/server/appointment-router.test.ts:
  - Use appRouter or appointmentRouter with createCallerFactory.
  - Mock context:
    - For public procedures: minimal ctx with db/supabase stubs.
    - For protected procedures: ctx.session.user present.
  - Assert:
    - requestBookingPublic:
      - Valid input → delegates to AppointmentService.createPublicBookingRequest.
      - Invalid input → Zod/TRPC error.
    - requestBooking:
      - No session → UNAUTHORIZED.
      - Valid session/input → delegates to AppointmentService.requestBookingForAuthenticatedUser.
    - getAvailableSlots:
      - Delegates to AppointmentService.getAvailableSlots.

- tests/server/admin-router.test.ts:
  - Use adminRouter or appRouter.admin via createCallerFactory.
  - Mock admin ctx:
    - user with admin role and supabase client mocks.
  - Assert:
    - listPublicBookingRequests / updatePublicBookingRequestStatus / linkPublicBookingRequestToAppointment:
      - Enforce adminProcedure (non-admin → TRPCError).
      - Use Supabase mocks with expected filters/update shapes.
    - getUsers / getDashboardMetrics:
      - Return expected stub payloads.

2) Playwright E2E specs (outline only)

- /booking:
  - Submit lead form, assert confirmation text.
  - Optionally verify persisted lead in test DB via helper.

- /portal/appointments/book:
  - With seeded clinic_id and slots + logged-in user:
    - Select slot, submit booking, assert success.

- /admin/bookings:
  - With seeded leads + admin user:
    - Load dashboard, verify leads table.
    - Drive status transitions and assert UI/DB.

This completes the requested unit test integration for AppointmentService and sets a precise path for router tests and E2E specs, while maintaining your existing architecture and coding standards.
