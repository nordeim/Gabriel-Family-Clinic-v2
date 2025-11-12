I have:

- Switched the AppointmentService unit test to use Vitest (which is now installed and viable).
- Corrected its imports and mocking strategy to match the actual AppointmentService implementation.
- Ensured the tests exercise the critical booking behaviors without requiring architectural changes.

Summary of the implemented AppointmentService unit test

File: [tests/server/appointment-service.test.ts](tests/server/appointment-service.test.ts:1)

Key points:

1) Uses Vitest correctly

- Imports:
  - `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";`
- This aligns with your explicit installation of vitest@4.0.8.
- This test suite is independent of the Jest-based `npm test` placeholder and can be run via a dedicated Vitest command (to be wired into package.json in a future step if desired).

2) Correct imports from AppointmentService

- Imports from the real service file:

  - `import { AppointmentService, BookingError, SlotNotFoundError, SlotUnavailableError, BookingInProgressError } from "../../src/services/appointment-service";`

- Matches actual exports in [src/services/appointment-service.ts](src/services/appointment-service.ts:244):
  - AppointmentService class with:
    - static createPublicBookingRequest
    - static requestBookingForAuthenticatedUser
  - Domain error classes.

3) Robust Supabase admin client mocking

- Mocks `@/lib/supabase/admin` using Vitest’s `vi.mock`:

  - Defines a shared `supabaseMock` object with:
    - fromMock, insertMock, selectMock, eqMock, limitMock, maybeSingleMock, rpcMock.
  - `createSupabaseAdminClient` returns an object:
    - from(): chainable-select API using the mocks.
    - rpc(): uses rpcMock.

- Before each test:
  - Resets all mocks via `mockReset()` to ensure isolation.
- After each:
  - `vi.clearAllMocks()` for safety.

This isolates AppointmentService from real Supabase and allows us to assert calls precisely.

4) Tests for createPublicBookingRequest

Suite: `describe("createPublicBookingRequest", ...)`

- Success case:
  - Arrange:
    - `supabaseMock.insertMock.mockResolvedValueOnce({ error: null })`
  - Act:
    - `const result = await AppointmentService.createPublicBookingRequest(validInput)`
  - Assert:
    - insertMock called once.
    - `result.status === "pending"`.
    - Message contains “received your request”.

- Failure case:
  - Arrange:
    - `supabaseMock.insertMock.mockResolvedValueOnce({ error: { message: "db down" } })`
  - Assert:
    - `status === "failed"`.
    - Message suggests retry / contacting clinic.

- Validation case:
  - Uses invalid input (e.g., empty phone).
  - Asserts:
    - `AppointmentService.createPublicBookingRequest(invalid as any)` rejects with `ZodError`.

This aligns with:
- publicBookingInputSchema.
- Implementation in [AppointmentService.createPublicBookingRequest](src/services/appointment-service.ts:351).

5) Tests for requestBookingForAuthenticatedUser

Suite: `describe("requestBookingForAuthenticatedUser", ...)`

- Happy path:
  - Arrange:
    - rpcMock returns:
      - `{ data: { status: "success", idempotent: false, result: { appointment_id, appointment_number } }, error: null }`
  - Assert:
    - rpcMock called with correct `booking.create_booking` payload.
    - Result:
      - `status === "success"`.
      - `appointmentId` and `appointmentNumber` set.

- Error mapping:

  For each scenario, rpcMock returns corresponding `data`:

  - `slot_not_found`:
    - `{ data: { status: "error", code: "slot_not_found" } }`
    - Expects `SlotNotFoundError`.
  - `slot_unavailable`:
    - `{ data: { status: "conflict", code: "slot_unavailable" } }`
    - Expects `SlotUnavailableError`.
  - `in_progress`:
    - `{ data: { status: "conflict", code: "in_progress" } }`
    - Expects `BookingInProgressError`.
  - Unknown error code:
    - `{ data: { status: "error", code: "weird" } }`
    - Expects `BookingError`.
  - RPC-level error:
    - `{ data: null, error: { message: "rpc failure" } }`
    - Expects `BookingError`.

These tests match the logic in [callBookingProcedure](src/services/appointment-service.ts:159) and [requestBookingForAuthenticatedUser](src/services/appointment-service.ts:295).

Why this is a stable foundation

- Uses Vitest, which you’ve explicitly added and confirmed.
- Respects the actual AppointmentService API and error semantics.
- Avoids modifying your runtime architecture:
  - Only mocks `@/lib/supabase/admin` in test scope.
- Can be run independently (e.g., via a future `npm run test:vitest`), without breaking your existing `npm test` placeholder.

Next recommended steps (clear, incremental)

1) Add a Vitest test script

In package.json, add (in a later step):

- `"test:unit": "vitest run --runInBand --reporter=dot"` or similar.

2) Add router unit tests

- Implement tests for:
  - [src/lib/trpc/routers/appointment.router.ts](src/lib/trpc/routers/appointment.router.ts:1)
  - [lib/trpc/routers/admin.router.ts](lib/trpc/routers/admin.router.ts:1)
- Use createCallerFactory and mock contexts to:
  - Assert validation + delegation to AppointmentService.
  - Assert adminProcedure enforcement for admin router.

3) Add Playwright e2e specs

- For:
  - `/booking`: public leads.
  - `/portal/appointments/book`: authenticated booking.
  - `/admin/bookings`: admin lead management.

Those can be implemented on top of the now-stable booking flow and unit tests.

Conclusion

- Vitest is confirmed viable and now used properly for AppointmentService tests.
- The AppointmentService unit test suite is aligned with your real code and isolated from infrastructure.
- The codebase is ready for the next layer of router and e2e tests without further architectural changes.
