Here is a focused, meticulous audit of how the implemented database schema is (and is not) currently wired into the codebase, measured against the Project Architecture Document. This is an architecture-level alignment report, not a line-by-line diff.

Legend:
- Aligned: Concept correctly wired end-to-end or with minimal gaps.
- Partial: Concept scaffolded but with placeholders / missing constraints / not using DB primitives.
- Missing/Misaligned: Concept present in DB but effectively unused or inconsistent in code.

1. Identity, patients, doctors, staff

Schema:
- clinic.clinics, clinic.users, clinic.patients, clinic.doctors, clinic.staff with proper relationships and multi-tenancy.

Code:

- NextAuth / auth:
  - [`src/server/auth/config.ts`](src/server/auth/config.ts:1) uses Prisma + NextAuth with DiscordProvider and db (Prisma).
  - This is currently independent of the Supabase-auth + clinic.users model.
- Supabase admin use:
  - [`lib/supabase/admin.ts`](lib/supabase/admin.ts:1) (not shown above, but present) and related utilities.
- Patient registration:
  - [`types/zod-schemas.ts`](types/zod-schemas.ts:1) defines PatientRegistrationSchema.
  - [`lib/auth/actions.ts`](lib/auth/actions.ts:1):
    - Uses Supabase admin to:
      - Create auth user.
      - Insert into patients table:
        - from("patients").insert({ user_id, clinic_id: "your-default-clinic-uuid", patient_number: `P-${Date.now()}`, ...})
    - This aligns conceptually with clinic.patients but:
      - Uses string literals ("your-default-clinic-uuid", fake NRIC hash).
      - Not using enums/constraints from migrations directly.
- TRPC routers leveraging patients:
  - [`lib/trpc/routers/patient.router.ts`](lib/trpc/routers/patient.router.ts:1):
    - getProfile: joins patients with users via Supabase.
    - getAppointments: fetches from appointments where patient_id matches.

Assessment:
- Alignment: Partial.
  - Uses Supabase client and patients/appointments tables as in schema.
  - But identity/auth is split (NextAuth+Prisma vs Supabase auth) and multi-tenancy (clinic_id) is hard-coded/placeholder.
- Key gaps:
  - No unified identity pipeline connecting NextAuth users to clinic.users.
  - Hard-coded clinic_id instead of deriving from context or system_settings.
  - RLS/authz assumptions in DB are not enforced in app code (no app.current_clinic_id/user_id settings).

2. Appointments, slots, booking flow, queue

Schema:
- clinic.appointments, clinic.appointment_slots, queue_management.
- booking.booking_requests + booking.create_booking() (atomic booking).

Code:

- Booking UX:
  - [`src/app/booking/page.tsx`](src/app/booking/page.tsx:1):
    - Modern UX form.
    - Commented explicitly:
      - No real booking persistence yet (Phase 2).
  - Uses:
    - `api.appointment.requestBooking.useMutation()`.
- Appointment service:
  - [`src/services/appointment-service.ts`](src/services/appointment-service.ts:1):
    - Implements requestBooking:
      - Validates input.
      - Currently:
        - Sends a “we’ll contact you” style response.
        - Does NOT call booking.create_booking().
        - Does NOT insert into appointments or booking_requests.
- tRPC:
  - [`src/lib/trpc/routers/appointment.router.ts`](src/lib/trpc/routers/appointment.router.ts:1):
    - getAvailableDoctors uses appointment_slots table (via Supabase) – partially aligned.
    - requestBooking mutation:
      - Contains placeholder call using Supabase RPC to create_booking, but marked TODO:
        - p_slot_id, p_patient_id, clinic context are placeholders ("...").
- Queue:
  - There is a hook [`hooks/use-queue-status.ts`](hooks/use-queue-status.ts:1) and some UI pieces, but:
    - No concrete implementation wired to queue_management table.

Assessment:
- Alignment: Partial.
  - Database-level booking and scheduling model is robust.
  - Code-level integration is intentionally incomplete; uses placeholders and does not yet exercise booking.create_booking or queue_management.
- Key gaps:
  - requestBooking does not yet:
    - Resolve user → patient_id.
    - Choose slot_id and clinic_id.
    - Call booking.create_booking with correct parameters.
  - Queue status features are UI-only; no real-time/RLS-backed queue wiring to DB.

3. Medical records, consultation, prescriptions

Schema:
- clinic.medical_records, prescriptions, prescription_items, lab_results, imaging_results, vaccination_records.

Code:

- Consultation router:
  - [`lib/trpc/routers/consultation.router.ts`](lib/trpc/routers/consultation.router.ts:1):
    - getPatientHistory:
      - Queries "medical_records" via ctx.supabase, joined with appointments.
      - Uses correct table name, aligned with schema.
    - updateConsultationNotes:
      - Updates medical_records for a given appointment_id.
      - Marked as a simplified placeholder.

Assessment:
- Alignment: Partial but structurally correct.
  - Correctly targets medical_records table.
  - No enforcement of roles/ownership beyond “protectedProcedure”; no mapping to DB RLS or treating doctor logic.
  - Prescriptions, lab_results, imaging_results tables are not yet wired to any concrete services or routers.

4. Payments, CHAS, Stripe integration

Schema:
- clinic.payments, payment_items, insurance_claims; CHAS-related fields in patients and payments.

Code:

- Payment router:
  - [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1):
    - createPaymentIntent:
      - Reads from appointments with nested patients chas_card_type.
      - Writes to payments table: appointment_id, patient_id, status: "pending", etc.
      - Uses Stripe via [`lib/integrations/stripe.ts`](lib/integrations/stripe.ts:1).
      - Placeholders:
        - clinic_id: "..." to be fetched from appointment.
      - Handles CHAS via [`lib/utils/chas-calculator.ts`](lib/utils/chas-calculator.ts:1).
- Webhook:
  - [`pages/api/webhooks/stripe.ts`](pages/api/webhooks/stripe.ts:1):
    - On payment_intent.succeeded:
      - Updates payments.status to "completed" based on metadata.paymentId.

Assessment:
- Alignment: High-level alignment, but Partial in implementation.
  - End-to-end story (create pending payment → Stripe intent → webhook update) matches schema intent.
  - Missing:
    - Correct clinic_id plumbing.
    - Full error handling and idempotency.
    - Use of insurance_claims table; CHAS is partly used via chas-calculator but not fully persisted.

5. Notifications & communications

Schema:
- clinic.notifications, sms_messages, email_messages, whatsapp_messages.

Code:

- There are templates:
  - [`lib/notifications/templates/AppointmentConfirmationEmail.tsx`](lib/notifications/templates/AppointmentConfirmationEmail.tsx:1).
- Routers:
  - admin.router has a communication broadcast concept, enqueuing jobs (using jobs table) for messages.

Assessment:
- Alignment: Conceptual.
  - The schema is ready, and code references notifications/jobs conceptually.
  - No unified NotificationFactory implementation wiring actual inserts into notifications or sms/email/whatsapp tables.
  - The broadcast flow is partial and depends on jobs + external providers not fully implemented.

6. Webhooks, webhook_events, jobs

Schema:
- webhook_events, integration_webhooks, webhook_logs + helpers (claim_next_event, mark_event_result).
- public.jobs table as simple job queue.

Code:

- Jobs:
  - [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1) and [`lib/jobs/types.ts`](lib/jobs/types.ts:1) exist.
  - They model a job queue aligned with public.jobs.
- Webhooks:
  - Stripe webhook route uses Supabase admin to update payments but does not yet use webhook_events state machine.

Assessment:
- Alignment: Partial but well-structured.
  - Jobs queue code matches 016_jobs_table.sql concept.
  - Webhook processing helpers from 014_webhook_helpers.sql are not yet used; Stripe webhook goes direct.
  - No generic webhook worker implemented yet to claim/process webhook_events.

7. Telemedicine

Schema:
- telemedicine_sessions table in 009_system_and_integration_tables.sql.

Code:

- Telemedicine router:
  - [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1):
    - Validates appointment membership.
    - Reads telemedicine_sessions.
    - If not exists:
      - Uses Daily.co integration to create a room.
      - Inserts into telemedicine_sessions with placeholder clinic_id/patient_id/doctor_id.
- UI:
  - [`pages/dashboard/telemedicine/consultation/[appointmentId].tsx`](pages/dashboard/telemedicine/consultation/[appointmentId].tsx:1) consumes telemedicine.getTelemedicineSession.

Assessment:
- Alignment: Strong conceptually, Partial in details.
  - Correct table usage: telemedicine_sessions.
  - Placeholders for clinic_id/patient_id/doctor_id must be replaced with real values derived from appointment + users.
  - Security/authorization is basic; must be tightened to match RLS and PDPA expectations.

8. Health screening

Schema:
- health_screening_packages, health_screening_results.

Code:

- [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1):
  - Currently returns empty arrays / TODO notes.

Assessment:
- Alignment: Scaffolding only.
  - Tables exist; code acknowledges but does not implement real queries.

9. Feedback

Schema:
- public.user_feedback with FK to clinic.users (fixed).

Code:

- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1):
  - Inserts into "user_feedback" with user_id = ctx.user.id.

Assessment:
- Alignment: Good, with one assumption:
  - Assumes ctx.user.id matches clinic.users.id (i.e., unified user identity).
  - In current code, auth stack is mixed (NextAuth+Prisma vs Supabase), so ensure ctx.user is sourced from the same identity space as clinic.users.
- Otherwise, router+schema integration is correct and uses the fixed FK target.

10. System settings, feature flags

Schema:
- system_settings, feature_flags.

Code:

- No centralized ConfigService yet that:
  - Reads from system_settings.
  - Evaluates feature_flags.

Assessment:
- Alignment: Missing.
  - DB supports configuration/flags; app currently uses hard-coded settings and lacks a runtime feature-flag layer.

11. RLS, audit, security

Schema:
- 010_audit_setup.sql and 011_rls_policies.sql implement audit_logs and representative RLS.
- Depend on:
  - current_setting('app.current_user_id'), etc.
  - DB roles with clinic_* naming.

Code:

- No infrastructure layer setting these session variables per request.
- No explicit role mapping between app users and DB roles.

Assessment:
- Alignment: Conceptually designed, but not yet implemented in runtime.
  - As-is, RLS/audit functions will not behave as intended in Supabase/Next.js without additional wiring.

Summary of key findings

Aligned or close:

- Telemedicine:
  - Router and pages use telemedicine_sessions table correctly (with minor placeholders).
- Feedback:
  - feedback.router writes to user_feedback aligned with fixed schema.
- Patient/appointment queries:
  - patient.router, doctor.router, TodaySchedule, etc. query appointments/patients compatible with schema.
- Payments:
  - payment.router and Stripe webhook interact with payments table in a way that matches intent.

Partial / intentional scaffolding:

- Booking flow:
  - requestBooking and AppointmentService do not yet use booking.create_booking or idempotency.
- EMR:
  - consultation.router uses medical_records but is simplified; prescriptions/labs are unused.
- Jobs + webhook_events:
  - Jobs wired in code, webhook_events helpers unused.

Missing / misaligned (high value to fix):

1) Unified identity:
   - NextAuth + Prisma vs Supabase tables vs clinic.users is not fully reconciled.
   - Needs a clear strategy so ctx.user.id == clinic.users.id (or mapping layer).

2) Booking integration:
   - Wire requestBooking to booking.create_booking with real clinic_id, slot_id, patient_id.
   - Introduce a minimal Slot/Booking service that matches DB transaction semantics.

3) RLS/audit wiring:
   - Implement middleware/DB client wrapper that sets app.current_user_id, app.current_clinic_id, etc.
   - Align with Supabase JWT / policies or adjust policies accordingly.

4) Remove placeholders in critical flows:
   - payment.router: clinic_id: "..." and assumptions.
   - telemedicine.router: clinic_id/patient_id/doctor_id: "..." on session creation.
   - auth/actions.ts: hard-coded clinic_id, dummy NRIC hash.

5) Feature flags & settings:
   - Introduce a small Config/FeatureFlag service using system_settings and feature_flags tables.

Conclusion

- The database schema is ahead of the application code and largely consistent with the Project Architecture Document.
- The codebase contains solid scaffolding for most key domains (appointments, patients, payments, telemedicine, feedback, jobs).
- However, many flows are only partially wired:
  - Booking, RLS, identity unification, system settings, and generic webhook processing are the primary gaps.
- No critical contradictions were found (after fixing user_feedback FK); issues are mostly “not yet implemented” rather than “implemented incorrectly”.

This audit can now serve as the authoritative baseline for the next meticulous implementation phase: closing the gaps by wiring services and tRPC routers directly to the schema primitives (booking_create, telemedicine_sessions, payments, RLS, feature_flags) in small, well-scoped increments.
