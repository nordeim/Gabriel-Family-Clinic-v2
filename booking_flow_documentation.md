I have updated the core documentation set so that the booking flow and its tests are aligned with the current implemented architecture.

Summary of changes (all additive, no runtime behavior modification)

1) README.md

File: [README.md](README.md:1)

Key updates:

- Added a dedicated “Booking Flow — Current Implementation” section under the documentation/testing area that:

  - Describes the actual implemented paths:

    - Public booking requests:
      - Entry: `/booking`
      - Backend:
        - [`lib/trpc/routers/appointment.router.ts`](lib/trpc/routers/appointment.router.ts:1) → `requestBookingPublic`
        - [`AppointmentService.createPublicBookingRequest`](src/services/appointment-service.ts:351)
        - Persists to `booking.public_booking_requests` (via migrations including `019_public_booking_requests.sql`)
      - Behavior: lead capture only, PDPA-safe, no direct PHI-heavy appointment creation.

    - Authenticated bookings:
      - Entry: `/portal/appointments/book`
      - Backend:
        - Appointment router:
          - `getAvailableSlots` → `AppointmentService.getAvailableSlots` → `clinic.appointment_slots`
          - `requestBooking` (protected)
            - Requires `ctx.session.user.id` (NextAuth)
            - Uses `protectedBookingInputSchema`
            - Delegates to [`AppointmentService.requestBookingForAuthenticatedUser`](src/services/appointment-service.ts:295)
            - Calls `booking.create_booking` via Supabase RPC as defined in [`database/migrations/013_booking_transaction.sql`](database/migrations/013_booking_transaction.sql:1)
      - Behavior: concurrency-safe, idempotent, returns `BookingResult` / typed errors.

    - Admin/staff booking management:
      - Backend:
        - [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1) with `adminProcedure`
        - `listPublicBookingRequests`, `updatePublicBookingRequestStatus`, `linkPublicBookingRequestToAppointment`
      - Role: bridge between public leads and confirmed appointments.

- Added a “Booking & Testing Strategy” subsection that:

  - Documents Vitest-based unit tests:
    - [`tests/server/appointment-service.test.ts`](tests/server/appointment-service.test.ts:1)
    - [`tests/server/appointment-router.test.ts`](tests/server/appointment-router.test.ts:1)
    - [`tests/server/admin-router.test.ts`](tests/server/admin-router.test.ts:1)
  - Documents Playwright E2E plan for:
    - `/booking` public leads.
    - `/portal/appointments/book` authenticated bookings.
    - `/admin/bookings` admin workflows.

This turns README into an accurate, high-level entry for the implemented booking flows and their tests.

2) AGENT.md

File: [AGENT.md](AGENT.md:1)

Key updates:

- Replaced the previous generic first-delivery checklist at the end with:

  - “Booking Flow — Implementation Snapshot”

    - Mirrors the actual code:

      - Public booking requests:
        - `/booking` → `appointment.requestBookingPublic` → `AppointmentService.createPublicBookingRequest` → `booking.public_booking_requests`.

      - Authenticated bookings:
        - `/portal/appointments/book`
        - `appointment.getAvailableSlots` / `appointment.requestBooking`
        - `AppointmentService.requestBookingForAuthenticatedUser`
        - `booking.create_booking` stored procedure.

      - Admin/staff booking management:
        - `admin.listPublicBookingRequests`
        - `admin.updatePublicBookingRequestStatus`
        - `admin.linkPublicBookingRequestToAppointment`
        - All via [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1) and Supabase Postgres.

  - “Booking-Related Testing Strategy”

    - Defines the authoritative expectations for:
      - Vitest:
        - `npm run test:unit`
        - Appointment service + router + admin router suites and what they must verify.
      - Playwright E2E:
        - `npm run test:e2e`
        - Public, authenticated, and admin flows to be covered.

- Ensures AGENT.md is now the single source of truth for:
  - How booking is wired (tRPC → services → DB).
  - How to extend tests without violating architecture.

3) Project_Architecture_Document.md

File: [Project_Architecture_Document.md](Project_Architecture_Document.md:1)

Key updates:

- Updated the “Application Logic Flow” / booking sequence to match reality:

  - Replaced the old generic `/api/appointments` + cache flow with a “Booking Flow (Aligned with Current Implementation)” sequence:

    - `/booking`:
      - tRPC `appointment.requestBookingPublic` → `AppointmentService.createPublicBookingRequest` → `booking.public_booking_requests`.

    - `/portal/appointments/book`:
      - `appointment.getAvailableSlots` → `AppointmentService.getAvailableSlots` → `clinic.appointment_slots`.
      - `appointment.requestBooking` (protected) → `AppointmentService.requestBookingForAuthenticatedUser` → `booking.create_booking` stored procedure.

    - `/admin/bookings`:
      - `admin.listPublicBookingRequests`, `admin.updatePublicBookingRequestStatus`, `admin.linkPublicBookingRequestToAppointment`.

- Replaced the illustrative, outdated testing snippet in “10.2 Testing Strategy” with a “Booking-Focused Testing Strategy (Current)” section:

  - Documents:
    - Vitest unit tests:
      - AppointmentService: Supabase admin client mocked; RPC mapping verified.
      - appointment.router: createCallerFactory + service mocks.
      - admin.router: createCallerFactory + Supabase admin mocks.
    - Playwright E2E scenarios:
      - `/booking`, `/portal/appointments/book`, `/admin/bookings` as the canonical flows.

- Keeps the rest of the architecture doc intact but now consistent with:
  - NextAuth + Prisma as identity.
  - Supabase as Postgres only.
  - Booking implemented via tRPC + AppointmentService + stored procedure.

Result

Across:

- [README.md](README.md:1)
- [AGENT.md](AGENT.md:1)
- [Project_Architecture_Document.md](Project_Architecture_Document.md:1)

The documentation now:

- Accurately reflects the implemented booking flows:
  - Public leads
  - Authenticated transactional bookings
  - Admin conversion workflows
- Explicitly references the real code paths and migrations.
- Codifies the booking-related testing strategy:
  - Vitest unit tests for service and routers.
  - Planned Playwright E2E coverage for end-to-end booking behavior.

These updates are aligned with the Meticulous Approach and provide a coherent, authoritative baseline for future contributors and for further incremental enhancements to the booking system and its tests.
