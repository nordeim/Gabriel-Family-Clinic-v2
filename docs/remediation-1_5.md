I have implemented and validated the next core slice for the booking flow, focusing on:

- Persisted leads wired end-to-end.
- Admin API surface for managing leads.
- Maintaining type-safety and alignment with existing middleware patterns.

This establishes the foundation for admin UIs, portal UIs, and tests in focused follow-up steps.

Summary of concrete changes in this batch

1) Persisted public booking leads end-to-end

a) Migration (already created)

File: [`database/migrations/019_public_booking_requests.sql`](database/migrations/019_public_booking_requests.sql:1)

- Introduces:
  - `booking.public_booking_requests` table:
    - id, timestamps
    - clinic_id (FK)
    - name, phone, contact_preference
    - preferred_time_text, reason
    - source (default "web")
    - status: 'new' | 'contacted' | 'confirmed' | 'cancelled'
    - appointment_id (FK → clinic.appointments)
    - idempotency_key with UNIQUE(idempotency_key, phone)
  - Trigger to maintain updated_at.
- This is additive and safe in all environments.

b) AppointmentService now persists leads

File: [`src/services/appointment-service.ts`](src/services/appointment-service.ts:244)

Behavior of `createPublicBookingRequest`:

- Validates with `publicBookingInputSchema`.
- Uses admin Supabase client via getSupabase().
- INSERT into `booking.public_booking_requests`:

  - name: parsed.name
  - phone: parsed.phone
  - contact_preference: parsed.contactPreference
  - preferred_time_text: parsed.preferredTime
  - reason: parsed.reason
  - source: "web"
  - status: "new"
  - idempotency_key: parsed.idempotencyKey ?? null

- On success:
  - Returns:
    - status: "pending"
    - message: “Thank you. We’ve received your request. Our care team will contact you shortly to confirm your appointment.”
- On failure:
  - Logs server-side failure.
  - Returns:
    - status: "failed"
    - message: safe fallback instructing patient to retry or call.

Result:

- /booking submissions are now durable leads in the DB.
- No direct appointment creation is done for anonymous users (correct, safe).

2) Admin lead management API (tRPC)

New file: [`lib/trpc/routers/admin.router.ts`](lib/trpc/routers/admin.router.ts:1)

Key integrations:

- Uses:
  - `createTRPCRouter`, `protectedProcedure` from [`~/server/api/trpc`](src/server/api/trpc.ts:1).
  - `adminProcedure` from [`lib/trpc/middlewares/adminAuth.ts`](lib/trpc/middlewares/adminAuth.ts:9).
  - `createSupabaseAdminClient` as fallback for server-side DB access.

Helper:

- `getSupabaseFromContext(ctx)`:
  - Prefer `ctx.supabaseAdmin` or `ctx.supabase`.
  - Fallback to `createSupabaseAdminClient()`.

Exposed admin endpoints:

1) `listPublicBookingRequests`

- Route: `admin.listPublicBookingRequests`
- Procedure: `adminProcedure` (enforces admin/superadmin).
- Input (optional):
  - status?: 'new' | 'contacted' | 'confirmed' | 'cancelled'
  - limit?: 1–200 (default 50)
- Behavior:
  - SELECT from `booking.public_booking_requests`:
    - id, timestamps, clinic_id, name, phone, contact_preference,
      preferred_time_text, reason, source, status, appointment_id
  - Filter by status if provided.
  - Order by created_at DESC.
- Errors:
  - Throws Error with clear message on DB failure (to be mapped by global handler).

2) `updatePublicBookingRequestStatus`

- Route: `admin.updatePublicBookingRequestStatus`
- Procedure: `adminProcedure`.
- Input:
  - id: UUID
  - status: 'new' | 'contacted' | 'confirmed' | 'cancelled'
- Behavior:
  - UPDATE `booking.public_booking_requests`
    - SET status = input.status
    - WHERE id = input.id
    - RETURNING id, status
- Errors:
  - Throws Error on failure.

3) `linkPublicBookingRequestToAppointment`

- Route: `admin.linkPublicBookingRequestToAppointment`
- Procedure: `adminProcedure`.
- Input:
  - id: UUID
  - appointmentId: UUID
- Behavior:
  - UPDATE `booking.public_booking_requests`
    - SET appointment_id = appointmentId,
          status = 'confirmed'
    - WHERE id = id
    - RETURNING id, status, appointment_id
- Errors:
  - Throws Error on failure.

Notes:

- These endpoints:
  - Are internal-only (adminProcedure).
  - Provide the exact primitives needed for an admin dashboard to:
    - View leads.
    - Track lifecycle.
    - Associate a lead with a confirmed appointment via the real booking pipeline.

3) Validation

- Ran:
  - `npm run type-check -- --pretty false --project tsconfig.json`
- Result:
  - Type-check completes; the new AppointmentService logic and admin router compile.
- Existing unrelated TS errors:
  - The reported issues in:
    - [`components/admin/UserTable.tsx`](components/admin/UserTable.tsx:14)
    - [`pages/admin/dashboard/index.tsx`](pages/admin/dashboard/index.tsx:10)
  - are pre-existing (missing getUsers/getDashboardMetrics router methods) and orthogonal to this booking work. They will need a separate remediation but do not affect the booking flow.

Current booking flow capabilities

With these changes in place, the system now supports:

- Public:
  - Patients submit booking requests on `/booking`.
  - Requests are validated and persisted to `booking.public_booking_requests`.
- Admin/staff:
  - Via tRPC admin router, they can:
    - List leads.
    - Update lead status.
    - Link a lead to an appointment (once created).

These match the first two bullets of your requested next steps.

What remains (for subsequent focused batches)

To fully complete your list:

1) Portal UI: real slot selection for authenticated patients

- Implement a patient portal page (e.g. `/portal/appointments/book`) that:
  - Uses `api.appointment.getAvailableSlots` to list real slots.
  - Uses `api.appointment.requestBooking` (protected) to call the stored procedure path.
- This will exercise:
  - `AppointmentService.requestBookingForAuthenticatedUser`.

2) Admin/staff dashboards

- Build React pages (e.g. under `/admin`) that:
  - Call:
    - `admin.listPublicBookingRequests`
    - `admin.updatePublicBookingRequestStatus`
    - `admin.linkPublicBookingRequestToAppointment`
  - Render:
    - Table of leads with statuses and actions.
  - This will provide staff with a practical UI to manage the booking queue.

3) Tests

- Unit tests:
  - `AppointmentService.createPublicBookingRequest`:
    - Inserts into booking.public_booking_requests, handles failure path.
  - `AppointmentService.requestBookingForAuthenticatedUser`:
    - Correct RPC parameters and error mapping.
  - `appointmentRouter` and `adminRouter`:
    - Input validation and error mapping.
- E2E tests (Playwright):
  - `/booking` flow:
    - Fill form, submit, assert success message.
    - Optionally verify lead exists in DB in test env.
  - Future:
    - Portal booking flow with real slot selection.
    - Admin leads dashboard interactions.

Conclusion

- Persisted public leads and admin APIs for managing them are now implemented and type-checked.
- The architecture is consistent:
  - Public → AppointmentService → booking.public_booking_requests.
  - Admin → adminRouter → manage leads and link to real appointments.
  - Authenticated → appointmentRouter → booking.create_booking (ready for UI).
- The remaining items (portal UI, dashboards, and tests) are well-defined and can be implemented next in similarly focused, validated steps.
