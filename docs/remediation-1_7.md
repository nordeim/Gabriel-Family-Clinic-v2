I have implemented the next core piece of the booking flow: an authenticated patient portal booking UI wired to the real booking pipeline, and an admin tRPC router for managing public booking leads. Type-check passes for the new booking-related code; remaining type errors are unrelated legacy admin placeholders.

Here is the precise technical state and the plan for the remaining dashboards and tests.

1. Authenticated patient portal booking UI

File: [`src/app/portal/appointments/book/page.tsx`](src/app/portal/appointments/book/page.tsx:1)

Purpose:
- Provide an MVP vertical slice where a logged-in patient can:
  - See available appointment slots.
  - Select a slot.
  - Submit a real booking using the backend’s concurrency-safe pipeline.

Key behavior:

- Uses tRPC React client:
  - `api.appointment.getAvailableSlots.useQuery(...)`
  - `api.appointment.requestBooking.useMutation()`
- Renders:
  - List of available slots (from clinic.appointment_slots via getAvailableSlots).
  - Textarea for visit reason.
  - “Confirm Appointment” button.

Flow:

- Loads slots:

  - Currently uses:

    - clinicId: DEFAULT_CLINIC_ID or a placeholder UUID.

  - NOTE:
    - DEFAULT_CLINIC_ID is intentionally TODO and must be wired to a real configured clinic_id in your environment.
    - Until then, this page is a structural example and will show a configuration warning if DEFAULT_CLINIC_ID is empty.

- User selects a slot:
  - Sets selectedSlot in component state.

- User provides visitReason:
  - Must be at least 4 characters.

- Confirm:
  - Constructs idempotencyKey: `portal-booking-${slotId}-${timestamp}`.
  - Calls `api.appointment.requestBooking.mutate({
      clinicId,
      slotId,
      visitReason,
      idempotencyKey,
    })`
  - On success:
    - Shows confirmation message (including appointmentNumber when returned).
    - Redirects to `/portal/appointments` after a short delay (placeholder route for future appointment list).
  - On failure:
    - Shows user-friendly error from server or generic fallback.

Internal alignment:

- This page:
  - Exercises the protected `requestBooking` endpoint in [`src/lib/trpc/routers/appointment.router.ts`](src/lib/trpc/routers/appointment.router.ts:84).
  - Which uses `AppointmentService.requestBookingForAuthenticatedUser`.
  - Which calls the `booking.create_booking` stored procedure.
- Result:
  - Demonstrates the end-to-end “real” booking path for authenticated users.

2. Admin booking leads management API

File: [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1)

Purpose:
- Provide staff/admin with API endpoints to manage persisted leads in `booking.public_booking_requests`.

Core pieces:

- Imports:
  - `createTRPCRouter`, `protectedProcedure` from `~/server/api/trpc`.
  - `adminProcedure` from [`lib/trpc/middlewares/adminAuth.ts`](lib/trpc/middlewares/adminAuth.ts:9) (enforces admin/superadmin).
  - `createSupabaseAdminClient` as fallback.

- `getSupabaseFromContext(ctx)`:
  - Reuses `ctx.supabaseAdmin` or `ctx.supabase` if available.
  - Falls back to admin client.

Exposed procedures:

1) `admin.listPublicBookingRequests`
   - Input (optional):
     - status?: 'new' | 'contacted' | 'confirmed' | 'cancelled'
     - limit?: 1–200 (default 50)
   - Behavior:
     - SELECT core fields from booking.public_booking_requests.
     - Filter by status.
     - Order by created_at DESC, apply limit.
   - Access:
     - `adminProcedure` (admin-only).

2) `admin.updatePublicBookingRequestStatus`
   - Input:
     - id: UUID
     - status: 'new' | 'contacted' | 'confirmed' | 'cancelled'
   - Behavior:
     - UPDATE booking.public_booking_requests
       - SET status
       - WHERE id = input.id
       - RETURNING id, status.

3) `admin.linkPublicBookingRequestToAppointment`
   - Input:
     - id: UUID
     - appointmentId: UUID
   - Behavior:
     - UPDATE booking.public_booking_requests
       - SET appointment_id = input.appointmentId,
             status = 'confirmed'
       - WHERE id = input.id
       - RETURNING id, status, appointment_id.

These APIs are ready to be used by an admin UI to:

- View and filter leads.
- Progress their status.
- Link them to confirmed appointments created via the real booking flow.

3. Persisted leads wiring (previous slice, now fully integrated)

For completeness, booking leads are now:

- Created by:
  - `AppointmentService.createPublicBookingRequest` in [`src/services/appointment-service.ts`](src/services/appointment-service.ts:353).
  - Called via `appointment.requestBookingPublic` used by `/booking`.
- Stored in:
  - `booking.public_booking_requests` with status='new'.
- Managed by:
  - `admin.listPublicBookingRequests`
  - `admin.updatePublicBookingRequestStatus`
  - `admin.linkPublicBookingRequestToAppointment`

4. Validation status

- `npm run type-check`:
  - Runs successfully for all new booking-related files.
- Remaining TS errors (unchanged and outside this scope):
  - `components/admin/UserTable.tsx` expecting `admin.getUsers`.
  - `pages/admin/dashboard/index.tsx` expecting `admin.getDashboardMetrics`.
  - These are pre-existing and should be handled as a separate admin-module remediation; they do not affect the booking flow.

5. Next concrete steps (planned, not yet implemented)

To fully realize your request for portal UI, dashboards, and tests, the next focused changes should be:

A) Portal UI completion

- Implement `/portal/appointments/index.tsx`:
  - Lists user’s upcoming appointments (reads from your appointments/tRPC).
  - Confirms that bookings created via `/portal/appointments/book` are visible.
- Wire DEFAULT_CLINIC_ID:
  - Introduce a small config module (e.g. `config/clinic-config.ts`) to expose the active clinic_id.
  - Replace the placeholder in `/portal/appointments/book/page.tsx`.

B) Staff/admin dashboards

- Admin bookings leads page:
  - e.g. `/admin/bookings/index.tsx`
  - Uses:
    - `api.admin.listPublicBookingRequests`
    - `api.admin.updatePublicBookingRequestStatus`
    - `api.admin.linkPublicBookingRequestToAppointment`
  - UI:
    - Table with filters and status/action buttons.

- Admin appointments view:
  - e.g. `/admin/appointments/index.tsx`
  - Shows confirmed appointments, optionally joined to leads.

C) Tests

- Unit tests:
  - AppointmentService:
    - Mock Supabase client:
      - Assert createPublicBookingRequest insert & error handling.
      - Assert requestBookingForAuthenticatedUser calls booking.create_booking correctly and maps errors.
  - appointment.router & admin.router:
    - Validate schemas and error mapping via router-level tests.

- E2E test:
  - `/booking`:
    - Fill form, submit, assert success message.
    - In test DB, confirm row is added to booking.public_booking_requests.
  - `/portal/appointments/book`:
    - Authenticated scenario:
      - Seed some appointment_slots.
      - Select slot, confirm booking.
      - Assert backend shows confirmed appointment.

All of these follow the same meticulous, incremental pattern used so far and can be executed in subsequent steps without refactoring what is already stable.

This iteration’s result

- Public booking:
  - End-to-end: form → tRPC → AppointmentService → booking.public_booking_requests.
- Portal booking:
  - New page scaffolding: uses real slot listing + booking endpoint; ready once clinic_id is configured.
- Admin:
  - tRPC API endpoints exist for full lead lifecycle management.

The system is now structurally ready for you (or the next iteration) to add the final UI surfaces and tests with minimal friction and no architectural changes.
