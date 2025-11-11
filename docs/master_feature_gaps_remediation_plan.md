Phased implementation plan: close schema–code gaps with minimal, high-impact changes

Executive intent

Use the existing, robust database schema as the source of truth and incrementally wire the core flows so they are production-credible. Prioritize:

1) Real booking flow aligned with booking.create_booking.
2) Identity alignment for patients/doctors in Supabase-backed tables.
3) Payments wired to schema with Stripe + CHAS integration.
4) Telemedicine sessions tied to real appointments.
5) Feedback, health screening, notifications, and jobs as follow-ups.
6) RLS/audit wiring and configuration/feature flags.

Each phase is independently shippable, with clear file-level checklists. This plan assumes no changes are executed yet; it is a validated blueprint.

PHASE 1 — Production-grade booking pipeline (highest priority)

Goal

Make the public booking flow create real appointments in the clinic.* schema using the booking.create_booking() procedure + appointment_slots, with correct clinic_id, patient_id, slot_id, and idempotency, while keeping current UX.

Scope

- Implement minimal Supabase-backed AppointmentService.
- Wire tRPC appointment.router to use booking.create_booking.
- Update /booking page to use live data (slots) where feasible.
- Keep behavior safe and observable; no telemedicine/payments coupling yet.

Files and changes

1) [`src/services/appointment-service.ts`](src/services/appointment-service.ts:1)

- Purpose: Move from “informational stub” to real booking orchestrator.
- Changes:
  - Inject/use a Supabase admin client.
  - Implement:
    - resolveOrCreatePatient(user): maps auth user → clinic.users/patients using schema.
    - getAvailableSlots(clinicId, doctorId, date): query clinic.appointment_slots.
    - requestBooking({ userId, clinicId, slotId, patientId, visitReason, idempotencyKey }):
      - Calls Supabase RPC or SQL to execute booking.create_booking with proper arguments.
      - Returns normalized result (appointment_id, appointment_number, status).
- Checklist:
  - [ ] Import supabaseAdmin client.
  - [ ] Implement resolveOrCreatePatient consistent with clinic.patients schema.
  - [ ] Implement getAvailableSlots using appointment_slots.
  - [ ] Implement requestBooking calling booking.create_booking.
  - [ ] Map DB errors → domain errors (slot_not_found, slot_unavailable, etc.).
  - [ ] No hard-coded "..." values.

2) [`src/lib/trpc/routers/appointment.router.ts`](src/lib/trpc/routers/appointment.router.ts:1)

- Purpose: Expose booking APIs via tRPC using AppointmentService.
- Changes:
  - For getAvailableDoctors/slots:
    - Use AppointmentService.getAvailableSlots instead of placeholder.
  - For requestBooking:
    - Validate input with zod.
    - Derive:
      - clinicId: from config or (Phase 1) a single default clinic id constant.
      - userId: from ctx.user (protectedProcedure).
      - slotId: from input.
      - idempotencyKey: from client or generated server-side.
    - Call AppointmentService.requestBooking.
- Checklist:
  - [ ] Ensure requestBooking is protectedProcedure (requires logged-in user).
  - [ ] No direct Supabase calls with "..." placeholders.
  - [ ] Correctly pass idempotencyKey to booking.create_booking.
  - [ ] Return appointment info to client.

3) [`src/app/booking/page.tsx`](src/app/booking/page.tsx:1)

- Purpose: Frontend uses real API instead of pure stub.
- Changes:
  - Use api.appointment.getAvailableDoctors/slots to populate options.
  - On submit:
    - Call api.appointment.requestBooking (already wired).
    - Supply optional idempotency key (e.g., UUID per submission).
- Checklist:
  - [ ] Replace commentary stating “no real booking persistence” with real behavior.
  - [ ] Handle success: show appointment number if available.
  - [ ] Handle known errors gracefully (slot_unavailable, etc.).

Validation

- With migrations applied:
  - booking.create_booking should drive creation into appointments/appointment_slots.
- Phase 1 is shippable once:
  - [ ] Request/response types are stable.
  - [ ] No lingering "..." placeholders.
  - [ ] Basic tests confirm bookings persist correctly.

PHASE 2 — Identity and patient/doctor profile alignment

Goal

Ensure ctx.user and Supabase records coherently map to clinic.users/patients/doctors so downstream features (booking, telemedicine, payments, feedback) operate on consistent identities.

Scope

- Clarify whether NextAuth + Prisma remains or move fully to Supabase Auth.
- Provide a consistent mapping in tRPC context.

Files and changes

1) [`src/server/api/trpc.ts`](src/server/api/trpc.ts:1)

- Changes:
  - Ensure createTRPCContext exposes a stable user identity:
    - ctx.user.id must match clinic.users.id / Supabase auth uid, or there must be a translator.
- Checklist:
  - [ ] Document invariant: ctx.user.id is the canonical user id.
  - [ ] If NextAuth/Prisma remains, add mapping layer to clinic.users.

2) [`src/server/auth/index.ts`](src/server/auth/index.ts:1) and [`src/server/auth/config.ts`](src/server/auth/config.ts:1)

- Changes (if keeping NextAuth):
  - Confirm Prisma schema matches clinic.users or define sync path.
- Checklist:
  - [ ] Decide: unify on Supabase Auth or maintain bridging.
  - [ ] Avoid dual, divergent user stores.

3) [`lib/auth/actions.ts`](lib/auth/actions.ts:1)

- Purpose: Patient registration.
- Changes:
  - Replace placeholder clinic_id and NRIC handling with:
    - Default clinic_id from system_settings or config.
    - Proper hashing/encryption (consistent with DB helpers).
- Checklist:
  - [ ] Use real clinic_id (not "your-default-clinic-uuid").
  - [ ] Generate secure nric_hash instead of "...".
  - [ ] Align user_id with auth identity used across app.

Validation

- Phase 2 is done when:
  - [ ] booking, telemedicine, payments, feedback all rely on coherent user ids.
  - [ ] No conflicting identity sources without mapping.

PHASE 3 — Payments + CHAS: wire to payments table correctly

Goal

Turn the current payment scaffolding into a working, schema-aligned flow.

Files and changes

1) [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)

- Changes:
  - Fetch appointment including clinic_id and patient relationship (use correct Supabase joins).
  - Remove "clinic_id: \"...\"" placeholder:
    - Use appointment.clinic_id from DB.
  - Ensure payments insert matches schema:
    - payment_number / receipt_number generation consistent.
    - status enums align with payment_status.
- Checklist:
  - [ ] Validate appointment ownership using ctx.user.id.
  - [ ] Fill clinic_id from appointment.
  - [ ] Use ChasCalculator correctly and persist subsidy.
  - [ ] Update payments row with Stripe payment_intent_id.

2) [`pages/api/webhooks/stripe.ts`](pages/api/webhooks/stripe.ts:1)

- Changes:
  - Make sure it:
    - Uses metadata.paymentId and validates existence.
    - Updates payments.status to "completed".
- Checklist:
  - [ ] Ensure table/column names exactly match migrations.
  - [ ] Add minimal logging and guards.

3) [`components/payment/CheckoutForm.tsx`](components/payment/CheckoutForm.tsx:1)

- Changes:
  - Confirm createPaymentIntent mutation is awaited and errors handled.
- Checklist:
  - [ ] Show meaningful errors in UI.
  - [ ] Display total amount/CHAS breakdown if available.

Validation

- [ ] End-to-end: createPaymentIntent + Stripe + webhook leads to consistent payments record updates.

PHASE 4 — Telemedicine: tie sessions to real appointments and profiles

Goal

Complete telemedicine flow using telemedicine_sessions table and Daily.co integration without placeholders.

Files and changes

1) [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)

- Changes:
  - After verifying appointment:
    - Derive clinic_id, patient_id, doctor_id from appointment.
    - Insert telemedicine_sessions rows with real values (no "..." placeholders).
- Checklist:
  - [ ] Validate user is either patient or doctor of appointment.
  - [ ] Use existing telemedicine_sessions row if present; otherwise create.
  - [ ] Return room_url securely.

2) [`lib/integrations/daily.ts`](lib/integrations/daily.ts:1)

- Changes:
  - Ensure configuration from env.
- Checklist:
  - [ ] No hard-coded secrets.
  - [ ] Retry/error behavior documented.

3) [`pages/dashboard/telemedicine/consultation/[appointmentId].tsx`](pages/dashboard/telemedicine/consultation/[appointmentId].tsx:1)

- Changes:
  - Ensure it consumes telemedicine.getTelemedicineSession and handles errors gracefully.
- Checklist:
  - [ ] Correct loading/error states.
  - [ ] No business logic in UI.

Validation

- [ ] Telemedicine sessions are persisted and re-usable per appointment.
- [ ] Only authorized parties can obtain session links.

PHASE 5 — Feedback, health screening, notifications, jobs

5.1 Feedback (quick win)

- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)

Checklist:
- [ ] Confirm it uses protectedProcedure so ctx.user.id is set.
- [ ] Ensure user_feedback.user_id FK assumption holds (ctx.user.id → clinic.users.id).
- [ ] Potentially allow anonymous feedback without FK by making user_id optional.

5.2 Health screening

- [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)

Checklist:
- [ ] Implement getScreeningPackages from clinic.health_screening_packages.
- [ ] Implement getScreeningResults for authenticated patients from clinic.health_screening_results.

5.3 Notifications and jobs

- [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)

Checklist:
- [ ] Ensure CRUD uses public.jobs schema correctly.

- Notification sending:
  - Implement NotificationService to:
    - Insert rows into notifications + sms/email/whatsapp tables.
  - Integrate from admin.broadcast endpoint.

PHASE 6 — RLS, audit, and configuration alignment

Goal

Align runtime behavior with 010_audit_setup and 011_rls_policies using minimal, explicit wiring.

High-level tasks

- Introduce a DB client wrapper / Supabase admin client that:
  - Sets app.current_user_id, app.current_clinic_id, app.current_user_agent, app.current_request_id for each request (where appropriate).
- Consider a ConfigService:
  - Reads system_settings and feature_flags and exposes them to app.

Key files

- New: db/context helper (e.g. [`lib/db/session-context.ts`](lib/db/session-context.ts:1))
  - [ ] Set current_setting variables via Postgres on connect or per-request (for non-Supabase) OR
  - [ ] Adjust RLS to align with Supabase JWT claims if using Supabase-native auth.

Validation

- [ ] RLS policies actually reflect how ctx.user is used.
- [ ] audit_logs records are populated during writes in sensitive tables.

Plan validation

- Phases are ordered by:
  1) Direct patient impact & core value (booking).
  2) Foundational correctness (identity).
  3) Revenue (payments).
  4) Telemedicine (key differentiator).
  5) Supporting features (feedback, health screening, notifications, jobs).
  6) Hardening (RLS, audit, config).

- Each phase:
  - Is independently mergeable.
  - Minimizes blast radius.
  - Builds on the database schema rather than changing it.
  - Targets specific files with clear checklists.

No code changes have been applied as part of this answer. This is the finalized, validated implementation plan to guide meticulous execution in subsequent steps.
