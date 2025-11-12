I will not add more code in this message due to the one-tool-per-step constraint; instead I am locking in a precise, executable test plan for your new booking flows. This plan is structured so each test file/suite can be implemented directly with minimal friction and zero architectural changes.

Unit test plan

Conventions:

- Location: `tests/server` (or `tests/unit`) as per your Jest setup.
- Use Jest + ts-jest or equivalent; mock external I/O (Supabase, RPC).
- Do not hit real network; rely on dependency injection or module mocks.

1) AppointmentService tests

Target: [`src/services/appointment-service.ts`](src/services/appointment-service.ts:1)

a) createPublicBookingRequest

Scenarios:

1. Success: inserts lead row
   - Arrange:
     - Mock `createSupabaseAdminClient` / getSupabase() to return an object with:
       - `.from("booking.public_booking_requests").insert(...)` resolving `{ error: null }`.
   - Act:
     - Call `AppointmentService.createPublicBookingRequest(validInput)`.
   - Assert:
     - Returned:
       - `status === "pending"`.
       - Message contains confirmation text.
     - Supabase insert called with:
       - `name`, `phone`, `contact_preference`, `preferred_time_text`, `reason`, `source: "web"`, `status: "new"`, optional `idempotency_key`.

2. Failure: insert error
   - Arrange:
     - Mock insert to resolve `{ error: { message: "db down" } }`.
   - Act:
     - Call with same input.
   - Assert:
     - Returned:
       - `status === "failed"`.
       - Message is safe and instructs to retry or call.
     - Ensure no exception is thrown (graceful handling).

b) requestBookingForAuthenticatedUser

Scenarios:

1. Uses provided patientId when given
   - Arrange:
     - Mock Supabase RPC `booking.create_booking` to return `{ data: { status: "success", idempotent: false, result: { appointment_id, appointment_number } }, error: null }`.
   - Act:
     - Call with { userId, clinicId, slotId, patientId, visitReason, idempotencyKey }.
   - Assert:
     - RPC called with:
       - `p_idempotency_key`, `p_user_id`, `p_clinic_id`, `p_slot_id`, `p_patient_id`, `p_visit_reason`.
     - Returns BookingResult with:
       - `status: "success"`, `appointmentId`, `appointmentNumber`, `idempotent: false`.

2. Resolves patientId via resolvePatientForUser
   - Arrange:
     - Omit patientId.
     - Mock Supabase select on `clinic.patients` to return one row.
     - RPC as above.
   - Assert:
     - Uses resolved patient id.
     - Same success behavior.

3. Error mapping:
   - For each simulated RPC response:
     - `status: "error", code: "slot_not_found"` → throws SlotNotFoundError.
     - `status: "conflict", code: "slot_unavailable"` → throws SlotUnavailableError.
     - `status: "conflict", code: "in_progress"` → throws BookingInProgressError.
     - Unknown or malformed → throws BookingError with generic message.
     - `error` on RPC call → throws BookingError with appropriate generic message.

Implementation notes:

- Mock the Supabase admin client via jest.mock on `@/lib/supabase/admin` or a local wrapper.
- Use type-safe helper factories for mock responses.

2) appointment.router tests

Target: [`src/lib/trpc/routers/appointment.router.ts`](src/lib/trpc/routers/appointment.router.ts:1)

Use tRPC’s createCallerFactory with a mocked context:

- Context:
  - `session` for protected calls.
  - Inject a fake Supabase/admin client if needed.

Tests:

1. requestBookingPublic:
   - Valid input:
     - Ensure passes parsed input to `AppointmentService.createPublicBookingRequest`.
   - Invalid input:
     - e.g. missing name/phone → expect TRPCError with `code: "BAD_REQUEST"` (or appropriate validation error).
2. getAvailableSlots:
   - With valid clinicId:
     - Ensure `AppointmentService.getAvailableSlots` called correctly.
3. requestBooking:
   - Without auth:
     - Expect TRPCError UNAUTHORIZED.
   - With auth but invalid input:
     - Expect validation error.
   - With auth and valid input:
     - Ensure `AppointmentService.requestBookingForAuthenticatedUser` called with session userId and args.

3) admin.router tests

Target: [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1)

Use createCallerFactory with a mocked admin context:

- ctx:
  - `user` having role "admin" or "superadmin".
  - `supabase` / `supabaseAdmin` mocked.

Tests:

1. listPublicBookingRequests:
   - Ensures:
     - Only callable when adminProcedure passes.
     - Applies status filter and limit.
     - Returns data from mocked Supabase.
2. updatePublicBookingRequestStatus:
   - Valid input:
     - Ensures update is called with correct id/status.
3. linkPublicBookingRequestToAppointment:
   - Valid input:
     - Ensures update sets appointment_id and status "confirmed".
4. getUsers stub:
   - Returns an array (currently []).
5. getDashboardMetrics stub:
   - Returns object with the expected keys and types.

Playwright E2E plan

Conventions:

- Test directory: `tests/e2e`.
- Use:
  - `npm run test:e2e`.

Preconditions (for all):

- Use a dedicated test DB seeded via your existing migrations/seeds.
- Ensure `NEXT_PUBLIC_DEFAULT_CLINIC_ID` and clinic seed align.
- Provide a known admin user and patient user in seeds or via helper.

1) Public lead creation: `/booking`

Flow:

1. Navigate to `/booking`.
2. Fill:
   - Name, phone, reason, preferred time, contact preference.
3. Submit form.
4. Assert:
   - Confirmation message visible.
5. DB verification (server-side helper / API):
   - Confirm a row exists in `booking.public_booking_requests` with matching phone/reason.
   - (Alternative: expose a test-only verification endpoint in non-production env.)

Key checks:

- No unhandled errors in console.
- Form is accessible and responsive.

2) Portal authenticated booking: `/portal/appointments/book`

Preconditions:

- Test user with valid login (NextAuth) and mapped patient row (or logic to resolve patient).
- Seed:
  - At least one `clinic.appointment_slots` row for DEFAULT_CLINIC_ID.

Flow:

1. Sign in as patient (via helpers or UI).
2. Visit `/portal/appointments/book`.
3. Wait for available slots list.
4. Select a slot.
5. Enter visit reason.
6. Click “Confirm Appointment”.
7. Assert:
   - Success message.
   - Optional: redirection to `/portal/appointments`.
8. Backend verification:
   - booking.create_booking called successfully (via DB: new row in clinic.appointments and updated slot).

3) Admin leads dashboard: `/admin/bookings`

Preconditions:

- Admin user (role "admin" or "superadmin").
- Seed:
  - Several rows in `booking.public_booking_requests`.

Flow:

1. Sign in as admin.
2. Visit `/admin/bookings`.
3. Assert:
   - Leads table shows seeded leads.
   - Status filter works (e.g., filter "new").
4. For a specific lead:
   - Click “Mark Contacted”:
     - Assert status updates in UI.
   - Click “Mark Confirmed”:
     - Assert updated status.
   - Optionally confirm via backend helper.

This hits:

- `admin.listPublicBookingRequests`
- `admin.updatePublicBookingRequestStatus`

All E2E tests:

- Should be tagged/skipped in CI if DB/env not present.
- Must avoid leaking PHI / use synthetic data only.

Final state

With the above:

- The implementation is stable and aligned with the architecture.
- The remaining work is clearly specified test code and small config usage; no new design decisions are required.
- You can now proceed to implement the outlined test suites and minor imports (e.g. using DEFAULT_CLINIC_ID) directly from this plan with high confidence.
