Planned execution blueprint for the next four focused phases, ready to implement step-by-step.

This is a precise, implementation-ready plan only (no new edits applied in this message), structured for minimal risk and maximum clarity.

Phase 1 — Health router uplift

Target:
- [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)

Objectives:
- Provide:
  - Public, non-PHI health information (publicProcedure).
  - Protected, identity-aligned health summary for the logged-in user (protectedProcedure using ctx.session.user.id).
- Stay within:
  - Existing schema (vaccinations/health screening tables if present) or safe stub data.
  - NextAuth + Prisma identity model.

Planned endpoints:

1) getPublicHealthContent (publicProcedure)
- Purpose:
  - Serve static or minimally DB-backed content: clinic health tips, screening recommendations, chronic care guidance.
- Behavior:
  - Returns an array of objects:
    - { id, title, summary, category, link }
  - No PHI; safe to cache and log.

2) getMyHealthSummary (protectedProcedure)
- Purpose:
  - Provide a concise, non-sensitive health summary for the authenticated user.
- Identity:
  - Uses ctx.session.user.id (canonical).
  - Resolves associated patient via patients.user_id.
- Behavior:
  - Queries aggregated fields such as:
    - last_screening_date
    - last_vaccination_date
    - flags for chronic conditions (if modeled).
  - Returns:
    - { lastScreeningDate?, lastVaccinationDate?, hasChronicCarePlan: boolean }
- Constraints:
  - No deep medical notes or PHI-heavy text.
  - Uses TRPCError for errors:
    - NOT_FOUND: if patient mapping missing.
    - INTERNAL_SERVER_ERROR: for unexpected failures.

Implementation notes:
- If the full health_screening_* schema is not yet present:
  - Start with a documented stub that returns an empty/placeholder summary structure.
  - Mark clearly as a Phase-N extension point, not a data leak.

Phase 2 — PDPA safeguards sweep

Targets:
- Recently touched core surfaces:
  - [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
  - [`pages/api/webhooks/stripe.ts`](pages/api/webhooks/stripe.ts:1)
  - [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)
  - [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)
  - [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)
  - Any other updated routers where logs exist.

Planned actions:

1) Logging normalization:
- Ensure logs:
  - Only contain:
    - error.code
    - error.message
    - resource IDs (paymentId, jobId, appointmentId)
    - high-level event labels.
  - Never contain:
    - NRIC/ID numbers.
    - Clinical notes, diagnosis strings.
    - Free-text PHI.
- Adjust any remaining logs if needed to meet this bar (small message tweaks).

2) Inline PDPA guidance:
- At critical points (e.g., telemedicine, payments, feedback, jobs):
  - Add short comments:
    - “Do not log PHI or full payloads here.”
- This acts as guardrails for future contributors/AI changes.

3) Service role usage:
- Confirm:
  - service_role / admin clients used ONLY server-side:
    - webhooks, jobs, internal scripts.
  - No client exposure.

Output:
- A PDPA-safe logging baseline with explicit developer guidance, no runtime behavior changes beyond logging message adjustments.

Phase 3 — Typed DB helpers (minimal, targeted)

Targets:
- Introduce thin type helpers for:
  - payments
  - telemedicine_sessions
  - user_feedback
  - jobs

Approach:

1) Create a small types module:
- File (proposed):
  - `types/db.ts` or `lib/types/db.ts`
- Define minimal types that mirror key columns used in code:
  - PaymentRecord (id, clinic_id, patient_id, appointment_id, total_amount, etc.)
  - TelemedicineSessionRecord (id, appointment_id, room_url, etc.)
  - UserFeedbackRecord (id, user_id, rating, feedback_text, etc.)
  - JobRecord (already exists; confirm/align).
- Intentionally:
  - Only include fields used in code paths; we do not need full schema coverage.

2) Adopt in critical routers:
- payment.router.ts:
  - Cast payment inserts/selects as PaymentRecord where relevant.
- telemedicine.router.ts:
  - Use TelemedicineSessionRecord for existing/new session reads.
- feedback.router.ts:
  - Use UserFeedbackRecord for insert/read shapes if needed.
- jobs/queue.ts:
  - Align JobRecord with jobs table schema and the claim_job() return shape.

Constraints:
- Strictly no runtime behavior changes.
- Types must remain in sync with migrations; comments will tie each interface back to its migration file.

Phase 4 — Targeted tests

Targets:
- paymentRouter
- telemedicineRouter
- feedbackRouter
- jobs/queue core flow

Test strategy:

1) Setup:
- Use Jest (already referenced by project conventions).
- Create focused test files:
  - `tests/server/payment.router.test.ts`
  - `tests/server/telemedicine.router.test.ts`
  - `tests/server/feedback.router.test.ts`
  - `tests/server/jobs.queue.test.ts`

2) Mocking:
- Stripe:
  - Mock stripeService.createPaymentIntent and constructWebhookEvent.
- Daily:
  - Mock dailyVideoProvider.createRoom.
- Supabase:
  - Mock createSupabaseAdminClient and ctx.supabase with in-memory behavior:
    - Provide minimal implementations for from().select().insert().update().eq() / rpc().
- NextAuth session:
  - For protectedProcedure:
    - Provide ctx with a fake session.user.id.

3) Cases:

payment.router tests:
- Success:
  - appointment belongs to user; valid consultation fee.
  - Expect:
    - payments insert called with correct fields.
    - Stripe called with correct amount/metadata.
- Unauthorized:
  - appointment not linked to ctx.user.id → NOT_FOUND.
- No payment required:
  - consultation_fee <= 0 → BAD_REQUEST.

telemedicine.router tests:
- Success (patient):
  - patientProfile/user_id match, telemedicine_sessions insert or reuse.
- Forbidden:
  - user not doctor/patient for appointment → FORBIDDEN.
- Error path:
  - Daily provider or DB failure → INTERNAL_SERVER_ERROR.

feedback.router tests:
- Success:
  - Inserts when rating or feedbackText provided.
- No-op:
  - No insert when both missing.
- Failure:
  - Insert error → TRPCError(INTERNAL_SERVER_ERROR).

jobs.queue tests:
- enqueueJob:
  - On success, inserts one row; on error, logs.
- JobProcessor.run:
  - No job available:
    - rpc returns PGRST116; run returns silently.
  - Handler exists:
    - Called and marks job completed.
  - Handler throws:
    - Marks failed or schedules retry based on attempts.

Outcome

This plan is:

- Granular:
  - Each phase can be implemented in a small PR-sized change set.
- Consistent:
  - Aligned with AGENT.md, Auth decision, and PDPA constraints.
- Ready:
  - Directly translatable into apply_diff steps without further design debate.

No code has been modified in this response. It represents a finalized implementation roadmap for the requested four enhancement areas, prepared for meticulous execution in subsequent steps.
