I have inspected the current booking-related code and schema and I will now define the complete design and implementation blueprint for a real, production-grade booking flow tailored to Gabriel Family Clinic’s patients and doctors.

Given your constraints (single message completion, one tool already used), I will:

- Deliver a meticulous implementation plan (what/why/how).
- Map out all files to add/update, with clear checklists.
- Validate plan correctness against the existing schema/architecture.
- Describe the concrete implementation steps and behaviors so they can be applied directly in subsequent edits.

This defines the target state for the Booking Appointment feature.

1. Deep understanding: real-world booking needs for this clinic

Based on the schema, docs, and your elderly-focused context, the booking system must:

- Support:
  - Simple, trusted booking for elderly and caregivers:
    - Minimal required fields.
    - Clear expectations (not an emergency, clinic will confirm).
  - Operationally safe clinic workflow:
    - Prevent double-booking.
    - Respect doctor availability and slot capacity.
    - Centralize everything in clinic.* tables.
  - Idempotent and robust behavior:
    - Users can retry without duplicate bookings.
    - Call center / staff can assist easily.
- Align with:
  - booking.create_booking() stored procedure in [`database/migrations/013_booking_transaction.sql`](database/migrations/013_booking_transaction.sql:31) as concurrency-safe source of truth.
  - booking_requests as idempotency/audit record.
  - clinic.appointment_slots as schedulable capacity.
- Provide:
  - A public booking endpoint (for unauthenticated patients) for “request a booking”.
  - An authenticated pipeline (for portal users) that can:
    - Resolve patient profile.
    - Choose an actual slot.
    - Call booking.create_booking and persist the result.
  - Clear, user-friendly outcomes and error messages:
    - Success: show appointment number and details.
    - In progress / conflict: clear messages and no duplicates.
    - Slot not available: guided retry.

Key design decisions:

- Use booking.create_booking as the only way to create real appointments from slots.
- Use a dedicated AppointmentService to wrap DB logic; tRPC router stays thin.
- Start with single-clinic support with a configurable default clinic_id (no hard-coded UUIDs).
- Support:
  - Phase A: Real server-side booking based on actual appointment_slots (for logged-in portal users).
  - Phase B: Map the existing public /booking UX into either:
    - A real booking when sufficient data is provided, or
    - A “booking request” record staff can convert into a real slot-based booking.

2. Implementation plan (files and responsibilities)

I’ll structure this to align with your master_remediation_plan Phase 1 and current code.

A) Core configuration

1) File: config/clinic-config.ts (new)

Purpose:
- Centralize the default clinic_id and related booking config (e.g., default duration, booking horizon).
- Prevent scattering magic IDs.

Checklist:
- [ ] Export an object:
      - defaultClinicId: string | null
      - booking:
        - maxDaysInAdvance
        - defaultDurationMinutes
- [ ] For now, read defaultClinicId from:
      - system_settings or env (fallback allowed in dev).
- [ ] Document clearly that production must set a real clinic_id.

B) AppointmentService

2) File: src/services/appointment-service.ts (new)

Purpose:
- Encapsulate all booking/business logic:
  - Patient resolution.
  - Slot lookup.
  - Calling booking.create_booking().
  - Mapping DB results into domain objects.
  - Handling idempotency and errors.

Implementation outline:

- Imports:
  - createSupabaseAdminClient or supabaseAdmin from [`lib/supabase/admin.ts`](lib/supabase/admin.ts:1).
  - clinic config from config/clinic-config.ts.
  - zod types or domain types from /types if present.

- API (minimal):

  - resolveOrCreatePatient(input):
    - If user is authenticated (ctx.session.user.id):
      - Look up clinic.patients via canonical user_id mapping.
      - Create if missing (respecting schema; use hashed NRIC only if available).
    - If anonymous:
      - Create a lightweight “lead” record or rely on booking_requests only.
      - Do not create full PHI without authentication; keep it minimal.

  - getAvailableSlots({ clinicId, doctorId, date }):
    - Query clinic.appointment_slots:
      - Only slots:
        - is_available = true
        - slot_date >= today
        - optionally filtered by clinic/doctor/date.
    - Return typed list for frontend.

  - requestBookingViaProcedure({
        userId,
        clinicId,
        slotId,
        patientId,
        visitReason,
        idempotencyKey,
    }):
    - Validate inputs (non-empty idempotencyKey, etc.).
    - Call:
      - SELECT booking.create_booking(...);
    - Parse JSONB result:
      - On status=success:
        - Return appointmentId, appointmentNumber, status.
      - On slot_not_found, slot_unavailable, in_progress:
        - Throw typed domain errors (e.g., SlotNotFoundError, SlotUnavailableError, BookingInProgressError).
      - On other errors:
        - Throw generic BookingError.

  - createBookingRequestFromPublicForm({
        name,
        phone,
        reason,
        preferredTime,
        contactPreference,
        idempotencyKey,
    }):
    - This is for the current public /booking page.
    - For now:
      - Insert into a simple booking.leads or use booking_requests with:
        - status=pending and minimal payload in result.
      - OR, if no such table, use a tRPC-only behavior:
        - Return a success message and rely on staff manual handling.
    - Designed so future iterations can:
      - Map public request → real slot & booking.create_booking once patient is onboarded.

Checklist:
- [ ] Use supabaseAdmin (server-side) only; no public keys.
- [ ] Implement clear domain error classes to be mapped by tRPC.
- [ ] No hard-coded clinic_id; use config.defaultClinicId.
- [ ] Comprehensive JSDoc, including explanation of idempotency behavior.
- [ ] Strict types and minimal any/unknown usage.

C) tRPC router wiring

3) File: src/lib/trpc/routers/appointment.router.ts (current file exists in src/, not lib/)

Observed:
- Uses AppointmentService.createBookingRequest(input) but service file is missing or outdated.
- requestBooking is publicProcedure; currently comments state “no real persistence”.

Plan:

- Switch to:
  - For logged-in “real booking” operations:
    - Use protectedProcedure (needs ctx.session.user).
    - Accept clinicId, slotId, visitReason, idempotencyKey.
    - Call AppointmentService.resolveOrCreatePatient + requestBookingViaProcedure.
  - For public /booking form:
    - Keep a publicProcedure requestBookingPublic:
      - Input matches existing form (name, phone, reason, preferredTime, contactPreference, idempotencyKey).
      - Delegates to AppointmentService.createBookingRequestFromPublicForm.
      - Returns standardized confirmation message.

Concretely:

- Add or adjust procedures:

  - requestBooking:
    - protectedProcedure
    - input: { clinicId?, slotId, visitReason, idempotencyKey? }
    - Derive:
      - userId from ctx.session.user.id.
      - clinicId from input or default.
      - patientId via AppointmentService.resolveOrCreatePatient.
      - idempotencyKey: provided or generated.
    - Call AppointmentService.requestBookingViaProcedure.
    - Map domain errors to TRPCError codes:
      - SlotNotFoundError → NOT_FOUND
      - SlotUnavailableError → CONFLICT
      - BookingInProgressError → CONFLICT
      - Others → INTERNAL_SERVER_ERROR or BAD_REQUEST.

  - getAvailableSlots:
    - publicProcedure
    - input: { clinicId?, doctorId?, date? }
    - Calls AppointmentService.getAvailableSlots.

  - requestBookingPublic:
    - publicProcedure (existing behavior adjusted)
    - input: same as current requestBookingInput for /booking page.
    - Calls AppointmentService.createBookingRequestFromPublicForm.
    - Returns friendly message, no PHI.

Checklist:
- [ ] Ensure imports align: use `~/server/api/trpc` in src/ tree.
- [ ] Ensure no references to non-existent ~/services/... paths (align to actual path).
- [ ] Map errors cleanly to TRPCError with user-friendly messages.

D) Booking page integration

4) File: src/app/booking/page.tsx

Current:
- Nice client-side UX with validation.
- Calls api.appointment.requestBooking.useMutation.
- Comments claim no real persistence yet.

Plan:

- Rewire to new tRPC contract:

  - For anonymous users:
    - Call `api.appointment.requestBookingPublic.mutateAsync` with existing payload.
    - Show confirmation message; no assumption of confirmed slot.
  - For authenticated portal users (future enhancement):
    - Optionally detect session and:
      - Load available slots via `api.appointment.getAvailableSlots.useQuery`.
      - Present a structured slot picker and call `api.appointment.requestBooking` to create a real appointment.

Checklist:
- [ ] Update hook calls to match appointment.router actual exports (requestBookingPublic).
- [ ] Adjust success message to clarify:
  - “Request received; clinic will confirm.”
- [ ] Remove outdated comment about “no real persistence” once pipeline is wired.

E) Optional multi-step BookingForm

5) File: components/appointment/BookingForm.tsx

Currently:
- Placeholder multi-step wizard.

Plan:
- Either:
  - Wire this to call `api.appointment.getAvailableSlots` and `api.appointment.requestBooking`.
  - Or:
  - Remove/park until ready to integrate.

Checklist:
- [ ] If kept, ensure:
  - It is consistent with the new appointment.router contracts.
  - It does not bypass AppointmentService.

F) Tests

6) tRPC / service unit tests

Files (new):
- tests/server/appointment-service.test.ts
- tests/server/appointment-router.test.ts

Scope:

- AppointmentService tests:
  - [ ] Assert requestBookingViaProcedure:
    - Sends correct parameters to booking.create_booking.
    - Correctly maps success responses.
    - Correctly translates slot_not_found, slot_unavailable, in_progress to domain errors.
  - [ ] Assert getAvailableSlots:
    - Filters only future, available slots.

- appointment.router tests:
  - [ ] Validate input schemas.
  - [ ] Validate:
    - requestBooking (protected) requires session.
    - requestBookingPublic uses public input contract.
    - Error mapping to TRPCError codes.

7) E2E tests (Playwright)

File:
- tests/e2e/booking.spec.ts

Scope:
- [ ] Visit /booking.
- [ ] Fill form, submit, assert:
  - Confirmation message appears.
  - On repeat submit with same idempotencyKey, no duplicate outcome.
- [ ] In a controlled setup with real slots:
  - Log in as test patient.
  - Select slot.
  - Confirm booking.
  - Assert appointment row created in DB.

3. Validation of implementation plan

- Aligns with:
  - `booking.create_booking` in [`database/migrations/013_booking_transaction.sql`](database/migrations/013_booking_transaction.sql:31).
  - booking_requests idempotency behavior.
  - Elderly-friendly frontend already in [`src/app/booking/page.tsx`](src/app/booking/page.tsx:44).
  - Project patterns:
    - Thin tRPC routers.
    - Centralized services.
    - No ad-hoc SQL in components.
- Respects:
  - DB/seed guardrails:
    - No modification to migrations.
    - Seeds remain as defined.
  - Security:
    - Real booking creation behind protectedProcedure.
    - Public endpoint is a “request” that staff can act on; no over-exposure of internals.

4. Implementation status in this message

Given tool constraints, this message:

- Provides the complete, precise implementation blueprint.
- Confirms:
  - Current code is partway there (booking page + router stub), but:
    - AppointmentService is missing or not implemented.
    - requestBooking currently uses publicProcedure and does not call booking.create_booking.
- Does NOT:
  - Introduce partial, inconsistent code changes.
  - Break existing behavior.

This plan is ready to be applied directly in subsequent editing steps to:

- Add src/services/appointment-service.ts.
- Update src/lib/trpc/routers/appointment.router.ts to the new contract.
- Align src/app/booking/page.tsx to the new endpoints.
- Add focused tests.

This completes the meticulous planning, validation, and high-fidelity implementation outline for the Booking Appointment functionality in alignment with your schema and architecture.
