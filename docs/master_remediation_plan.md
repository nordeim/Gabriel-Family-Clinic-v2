# Master Remediation Plan — Schema ↔ Code Alignment

Purpose: Execute a meticulous, phased implementation to align the Gabriel Family Clinic v2.0 codebase with the production-grade database schema and Project Architecture Document, starting with the most critical patient- and revenue-impacting flows.

This plan is the single source of truth for upcoming remediation work. Each phase is:
- Independently shippable
- Strictly scoped
- Backed by file-level checklists
- Validated against both schema and architecture

Phases Overview

1) Phase 1 — Real Booking Pipeline (Highest Priority)
2) Phase 2 — Identity & Profile Alignment
3) Phase 3 — Payments & CHAS Integration
4) Phase 4 — Telemedicine Sessions Integration
5) Phase 5 — Feedback, Health Screening, Notifications & Jobs
6) Phase 6 — RLS, Audit & Config/Feature Flags Hardening

---

## Phase 1 — Real Booking Pipeline

Goal:
Turn the public booking UX into a real booking flow that writes into the clinic.* schema using booking.create_booking() and appointment_slots, with idempotency and clear error handling.

Key Principles:
- Use existing stored procedure booking.create_booking for concurrency safety.
- No schema changes; only code wiring.
- Minimal assumptions: support single-clinic deployment initially via a configured default clinic_id.

Files & Checklists:

1) src/services/appointment-service.ts

Planned changes:
- Implement a Supabase-backed AppointmentService that orchestrates:
  - Patient resolution
  - Slot lookup
  - Booking procedure invocation
- Encapsulate all DB details here, keeping routers thin.

Checklist:
- [ ] Import the Supabase admin client (or create one if missing).
- [ ] Implement resolveOrCreatePatient(userContext) that:
  - Finds or creates a clinic.patients row for the authenticated user.
  - Uses correct schema columns (clinic_id, user_id, patient_number, etc.).
- [ ] Implement getAvailableSlots(clinicId, doctorId, date) querying clinic.appointment_slots.
- [ ] Implement requestBooking({
      userId,
      clinicId,
      slotId,
      patientId,
      visitReason,
      idempotencyKey
    }) that:
  - Calls booking.create_booking via RPC or SQL.
  - Maps DB responses:
    - success → appointment_id, appointment_number
    - slot_not_found, slot_unavailable, in_progress → typed domain errors.
- [ ] No use of literal "..." placeholders.
- [ ] Comprehensive JSDoc comments for future maintainers.

2) src/lib/trpc/routers/appointment.router.ts

Planned changes:
- Use AppointmentService instead of direct placeholder Supabase calls.
- Enforce auth for booking mutations.
- Provide clear API surface for the booking page.

Checklist:
- [ ] Ensure requestBooking is a protectedProcedure (requires ctx.user).
- [ ] Validate input via zod schema (clinicId, slotId, visitReason, optional idempotencyKey).
- [ ] Derive:
  - userId from ctx.user.id.
  - clinicId from input or default config (single-clinic scenario).
  - slotId from input.
  - idempotencyKey (from input or generated).
- [ ] Call AppointmentService.requestBooking and return normalized result.
- [ ] Implement getAvailableSlots/Doctors using AppointmentService.getAvailableSlots.

3) src/app/booking/page.tsx

Planned changes:
- Connect to real tRPC endpoints while preserving UX.
- Surface booking result to user.

Checklist:
- [ ] Load available slots/doctors via api.appointment.* queries.
- [ ] On form submit, call api.appointment.requestBooking.mutate with correct parameters.
- [ ] Show success message with appointment number if available.
- [ ] Show user-friendly errors for known booking conflicts (slot_unavailable, etc.).
- [ ] Remove/adjust comments claiming “no real booking persistence” once wired.

Validation for Phase 1:
- [ ] Type-checks pass.
- [ ] Booking flow creates real records in appointments / booking_requests / appointment_slots.
- [ ] Graceful error handling verified via controlled failure scenarios.

---

## Phase 2 — Identity & Profile Alignment

Goal:
Ensure a unified, reliable mapping between authenticated users and clinic.users / clinic.patients / clinic.doctors so all downstream flows (booking, telemedicine, payments, feedback) operate on consistent identities.

Key Principles:
- Decide on canonical identity (Supabase Auth vs NextAuth+Prisma) or define a clear bridge.
- Avoid “dual user stores” without mapping.

Files & Checklists:

1) src/server/api/trpc.ts

Checklist:
- [ ] Ensure createTRPCContext exposes ctx.user with stable id.
- [ ] Document invariant: ctx.user.id must match the id used in clinic.users (or have a clear mapping layer).
- [ ] If using Supabase Auth, consume its JWT/user metadata accordingly.

2) src/server/auth/config.ts, src/server/auth/index.ts

Checklist:
- [ ] Confirm NextAuth configuration does not conflict with Supabase-backed identity model.
- [ ] Either:
  - Align Prisma schema with clinic.users, or
  - Treat NextAuth as a thin wrapper around the same identity records, or
  - Decide to migrate fully to Supabase Auth in a controlled future phase.

3) lib/auth/actions.ts

Checklist:
- [ ] Replace hard-coded clinic_id ("your-default-clinic-uuid") with:
  - A real default clinic from system_settings or configuration.
- [ ] Use proper NRIC hashing/encryption aligning with DB helper functions.
- [ ] Ensure created patient rows align with clinic.patients schema and identity invariant.

Validation for Phase 2:
- [ ] ctx.user.id → consistent mapping across booking, telemedicine, payments, feedback.
- [ ] No ambiguous “user id” sources in critical flows.

---

## Phase 3 — Payments & CHAS Integration

Goal:
Align payment flows (tRPC + Stripe + DB) with clinic.payments & related tables, including CHAS subsidy handling and robust error paths.

Files & Checklists:

1) lib/trpc/routers/payment.router.ts

Checklist:
- [ ] Fetch appointment with:
  - clinic_id
  - related patient (and chas_card_type)
- [ ] Remove "clinic_id: \"...\"" placeholder; use real clinic_id from appointment.
- [ ] Insert into payments with:
  - Correct enums (payment_status)
  - Generated payment_number and receipt_number consistent with conventions.
- [ ] Use ChasCalculator to compute subsidy and persist into payments fields.
- [ ] Update payment_intent_id after Stripe intent creation.

2) pages/api/webhooks/stripe.ts

Checklist:
- [ ] Validate incoming events and signature.
- [ ] On payment_intent.succeeded:
  - Use metadata.paymentId to update payments.status = "completed".
- [ ] Log failures; keep logic idempotent.

3) components/payment/CheckoutForm.tsx

Checklist:
- [ ] Ensure it calls createPaymentIntent correctly.
- [ ] Display payment amount and any CHAS subsidy info returned by API.
- [ ] Handle errors gracefully in UI.

Validation for Phase 3:
- [ ] End-to-end test: appointment → payment intent → Stripe → webhook → payments row updated.
- [ ] No schema mismatches (column names, types, enums).

---

## Phase 4 — Telemedicine Sessions Integration

Goal:
Use telemedicine_sessions to provide secure video sessions strictly tied to real appointments & identities.

Files & Checklists:

1) lib/trpc/routers/telemedicine.router.ts

Checklist:
- [ ] Validate current user is the assigned doctor or patient for the appointment.
- [ ] On getTelemedicineSession:
  - If session exists: return it.
  - Else:
    - Create Daily.co room.
    - Insert telemedicine_sessions with:
      - appointment_id
      - clinic_id, patient_id, doctor_id from appointment
      - room_url, room_name
- [ ] Remove all "..." placeholders.

2) lib/integrations/daily.ts

Checklist:
- [ ] Read API key & config from env.
- [ ] Provide typed errors and clear return type.

3) pages/dashboard/telemedicine/consultation/[appointmentId].tsx

Checklist:
- [ ] Consume telemedicine.getTelemedicineSession.
- [ ] Provide robust error/loading states.

Validation for Phase 4:
- [ ] Only authorized users can get session link.
- [ ] Session records are persisted and reusable.

---

## Phase 5 — Feedback, Health Screening, Notifications & Jobs

### 5.1 Feedback

File: lib/trpc/routers/feedback.router.ts

Checklist:
- [ ] Use protectedProcedure for submission.
- [ ] Insert into user_feedback with user_id from ctx.user.id.
- [ ] Confirm FK alignment with clinic.users.
- [ ] Optionally support anonymous feedback via nullable user_id.

### 5.2 Health Screening

File: lib/trpc/routers/health.router.ts

Checklist:
- [ ] Implement getScreeningPackages → clinic.health_screening_packages.
- [ ] Implement getScreeningResults → clinic.health_screening_results for current patient.

### 5.3 Notifications & Jobs

Files:
- lib/jobs/queue.ts
- admin-related routers (broadcast)

Checklist:
- [ ] Ensure queue.ts operations match public.jobs schema.
- [ ] Implement NotificationService to insert into notifications and channel-specific tables.
- [ ] Wire admin.broadcast to enqueue jobs (no direct external API calls inside router).

Validation for Phase 5:
- [ ] Feedback writes correctly.
- [ ] Health screening endpoints read real data.
- [ ] Notifications/jobs path is ready for worker integration.

---

## Phase 6 — RLS, Audit, Config & Feature Flags

Goal:
Make runtime behavior consistent with 010_audit_setup.sql, 011_rls_policies.sql, system_settings, and feature_flags, without destabilizing earlier phases.

Key Tasks:

1) Session Context for DB / Supabase Admin

New helper (example): lib/db/session-context.ts

Checklist:
- [ ] Encapsulate logic for setting:
  - app.current_user_id
  - app.current_clinic_id
  - app.current_user_agent
  - app.current_request_id
- [ ] Use where appropriate for server-side DB operations (non-Supabase or via RPC patterns).

2) Config / Feature Flags Service

New helper: lib/config/config-service.ts

Checklist:
- [ ] Read system_settings into a typed config object.
- [ ] Provide feature-flag checks from feature_flags table.
- [ ] Replace hard-coded flags/values in code where appropriate.

3) RLS Policy Review

Checklist:
- [ ] Confirm how Supabase auth or NextAuth maps into DB roles/claims.
- [ ] Adjust RLS policies if necessary to match deployed auth model.
- [ ] Ensure audit_logs is populated where expected.

Validation for Phase 6:
- [ ] No regressions in prior phases.
- [ ] RLS and audit start to provide real value in controlled environments.

---

## Execution & Validation Principles

- Execute phases sequentially:
  - Complete and validate each file’s checklist before moving to the next phase.
- For each modified file:
  - Re-validate:
    - Types (npm run type-check)
    - Lint (npm run lint)
  - Confirm alignment with:
    - Database schema
    - Project Architecture Document
    - Meticulous Approach principles.
- Avoid schema changes unless a critical bug is found; treat DB as stable contract.

This document is now the staged master remediation plan to guide systematic implementation.