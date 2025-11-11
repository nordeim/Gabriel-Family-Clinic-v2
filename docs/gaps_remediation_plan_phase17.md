Incremental test, typing, and PDPA refinement plan is defined as distinct, well-scoped follow-up steps, ready for direct execution.

Note: This message only plans and scopes; it does not modify code. Each item is sized to fit into a small, reviewable change-set consistent with the Meticulous Approach.

Step 1 — Typed DB helpers (minimal, high-signal types)

Goal:
Provide thin, explicit types for critical DB records used in routers/services to reduce accidental schema drift and clarify expectations.

Planned implementation:

1) Create a shared types module
- File:
  - [`types/db.ts`](types/db.ts:1) (new)
- Define minimal interfaces aligned with existing migrations:
  - PaymentRecord:
    - id, clinic_id, patient_id, appointment_id
    - payment_number, receipt_number
    - payment_date, payment_method, payment_gateway
    - subtotal, chas_subsidy_amount, total_amount
    - paid_amount, outstanding_amount
    - status, payment_intent_id?, transaction_reference?
  - TelemedicineSessionRecord:
    - id, appointment_id, clinic_id, patient_id, doctor_id
    - room_url, room_name?, session_token
    - scheduled_start, scheduled_end
  - UserFeedbackRecord:
    - id, user_id, rating?, feedback_text?, page_url, user_agent, created_at?
  - JobRecord:
    - Confirm/align with lib/jobs/types.ts and jobs table.

2) Adopt types in targeted files
- [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
  - Use PaymentRecord where reading/writing payments, especially for metadata.paymentId.
- [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
  - Use TelemedicineSessionRecord (or partial) when reading existing sessions.
- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
  - Use UserFeedbackRecord for insert shape checks (no behavior change).
- [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)
  - Align JobRecord import/usage with db.ts or existing types module.

Constraints:
- No runtime logic changes.
- Types must match migrations and be referenced with import type to satisfy ESLint.

Step 2 — PDPA/logging micro-sweep (surgical refinements)

Goal:
Ensure all updated areas adhere to PDPA-safe logging and documentation guidelines.

Targets:

1) payments
- [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
- [`pages/api/webhooks/stripe.ts`](pages/api/webhooks/stripe.ts:1)
Actions:
- Confirm:
  - No logs include patient details, card data, or PHI.
- Where needed:
  - Ensure logs use:
    - paymentId, appointmentId, error codes/messages only.

2) telemedicine
- [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
Actions:
- Keep only:
  - High-level error logs without room names tied to identities.
- Add a short comment near logs:
  - “Do not log PHI or full session context.”

3) feedback
- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
Actions:
- Ensure:
  - Error logs do not include raw feedback text.
- If current logging prints error objects only:
  - Add comment clarifying PHI/logging rules.

4) jobs
- [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)
Actions:
- Already structured; verify:
  - No payloads or PHI are logged.
  - Keep logs strictly infra-level (queue names, jobId, error codes).

5) health router
- [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)
Actions:
- Confirm:
  - getPublicHealthContent is static and safe.
  - getMyHealthSummary returns minimal info only (already true).
- Add brief comment:
  - Reinforcing PHI constraints for future extensions.

Outcome:
- A very small set of comment/log message tweaks; no behavior changes.

Step 3 — Targeted tests (unit-level behavioral locks)

Goal:
Add lean tests that assert the core behavior of our remediated modules without requiring full integration environments.

Proposed structure:

1) paymentRouter tests
- File:
  - `tests/server/payment.router.test.ts`
Focus:
- Mocks:
  - stripeService.createPaymentIntent
  - ctx.supabase (appointments, payments)
- Cases:
  - Creates PaymentIntent when:
    - appointment exists for user, consultation_fee > 0.
    - Asserts:
      - payments insert called with aligned schema.
      - metadata.paymentId/appointmentId/patientId set.
  - Returns NOT_FOUND when:
    - Appointment not found or not owned.
  - Returns BAD_REQUEST when:
    - consultation_fee <= 0.

2) telemedicineRouter tests
- File:
  - `tests/server/telemedicine.router.test.ts`
Focus:
- Mocks:
  - dailyVideoProvider.createRoom
  - ctx.supabase (appointments, doctors, patients, telemedicine_sessions)
- Cases:
  - Authorized patient/doctor:
    - Uses existing telemedicine_sessions if present.
    - Else creates new session and persists.
  - Unauthorized user:
    - FORBIDDEN.
  - DB/provider failure:
    - INTERNAL_SERVER_ERROR.

3) feedbackRouter tests
- File:
  - `tests/server/feedback.router.test.ts`
Focus:
- Cases:
  - No rating/text → no insert; success: true.
  - Valid feedback → insert called with user_id from session.
  - Insert error → TRPCError(INTERNAL_SERVER_ERROR).

4) jobs/queue tests
- File:
  - `tests/server/jobs.queue.test.ts`
Focus:
- Mocks:
  - createSupabaseAdminClient, rpc, from().*
- Cases:
  - enqueueJob:
    - Successful insert.
    - Error path logs (assert call).
  - JobProcessor.run:
    - No job (PGRST116) → returns early.
    - Handler exists → markAsCompleted called.
    - Handler missing → markAsFailed called.
    - Handler throws:
      - retryJob or markAsFailed based on attempts.

5) healthRouter tests
- File:
  - `tests/server/health.router.test.ts`
Focus:
- getPublicHealthContent:
  - Returns static items.
- getMyHealthSummary:
  - When patient exists → returns minimal summary.
  - When missing → NOT_FOUND.

Execution notes:
- Each test file:
  - Uses mocked context and services (no live Supabase/Stripe/Daily).
  - Keeps tests deterministic and fast.

Step 4 — Small, sequential execution strategy

To keep changes atomic and reviewable:

1) Implement typed DB helpers + adoptions:
  - Add types/db.ts.
  - Update imports in payment/telemedicine/feedback/jobs to use import type.
2) Run PDPA/logging micro-sweep:
  - Adjust comments/logs where necessary.
3) Add tests:
  - One feature set per commit/focused change (e.g., paymentRouter tests, telemedicine tests, etc.).

Each of these can be applied in the next messages as surgical diffs, following the same meticulous pattern used so far, ensuring the codebase remains stable and aligned with the project’s architecture and compliance expectations.
