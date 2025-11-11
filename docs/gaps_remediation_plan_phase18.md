Typed DB helper module created as the first incremental refinement; ready to be adopted and followed by PDPA/logging tweaks and tests in subsequent small steps.

What was executed in this step

1) Introduced minimal DB-facing types

File created:
- [`types/db.ts`](types/db.ts:1)

Contents (high level):

- PaymentRecord
  - Mirrors key columns from payments (007_financial_tables.sql) that are relevant to application logic:
    - id, clinic_id, patient_id, appointment_id
    - payment_number, receipt_number
    - payment_date
    - payment_method, payment_gateway
    - subtotal, chas_subsidy_amount, total_amount
    - paid_amount, outstanding_amount
    - status
    - payment_intent_id?, transaction_reference?
  - Typed as numbers for monetary values, strings for IDs/dates, allowing adapters to handle serialization.

- TelemedicineSessionRecord
  - Aligns with telemedicine_sessions (009_system_and_integration_tables.sql) fields used in code:
    - id, appointment_id, clinic_id, patient_id, doctor_id
    - room_url, room_name?
    - session_token
    - scheduled_start, scheduled_end

- UserFeedbackRecord
  - For user_feedback:
    - id, user_id
    - rating?, feedback_text?
    - page_url, user_agent
    - created_at?

- JobRecord
  - For jobs table / job processing:
    - id
    - queue
    - payload
    - status
    - attempts
    - run_at
    - last_error?

Guidelines embedded in the file:
- Keep in sync with database/migrations.
- Use import type when consuming (to satisfy ESLint).
- These types are intentionally partial: they cover only fields used in code, not entire tables.

2) Why this is a good stopping point for this step

- Non-invasive:
  - No existing files were modified in this step; only a new types module was added.
- Prepares the next refinements:
  - payment.router, telemedicine.router, feedback.router, and lib/jobs/queue.ts can now:
    - Import these types via import type.
    - Replace ad-hoc casts with clear, shared interfaces.

Next precise steps (to be done in subsequent small changes)

1) Adopt typed DB helpers:
- Update:
  - [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
  - [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
  - [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
  - [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)
- To:
  - use import type { PaymentRecord, TelemedicineSessionRecord, UserFeedbackRecord, JobRecord } from "@/types/db";
  - tighten any loose unknown casts accordingly.

2) PDPA/logging micro-sweep:
- Perform a surgical pass on:
  - payments, telemedicine, feedback, jobs, health router, Stripe webhook.
- Ensure:
  - Logs only contain IDs, codes, and generic messages.
  - Comments explicitly forbid logging PHI.

3) Tests:
- Add minimal unit tests (with mocks) for:
  - paymentRouter.createPaymentIntent
  - telemedicineRouter.getTelemedicineSession
  - feedbackRouter.submitFeedback
  - JobProcessor + enqueueJob
  - healthRouter basic endpoints

This completes the first incremental refinement (typed helpers) cleanly. The project remains stable and ready for the next small, meticulous PR-sized steps to adopt these types, finalize PDPA-safe logging, and introduce targeted tests.
