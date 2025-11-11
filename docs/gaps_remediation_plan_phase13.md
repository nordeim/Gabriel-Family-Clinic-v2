Planned sequence for the next focused enhancement phases

You requested meticulous planning for the next enhancements as separate, focused phases. This response defines that roadmap concretely without applying new code changes yet. Each phase is small, reviewable, and aligned with AGENT.md and the Meticulous Approach.

Phase A — Health router uplift (schema- and auth-aligned)

Target:
- [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)

Current:
- Stub/placeholder (not fully implemented).

Goals:
- Provide a minimal but coherent health router that:
  - Exposes public health content (e.g., FAQs, screening info) via publicProcedure.
  - Provides protected endpoints for:
    - Fetching a patient’s vaccination/health-screening info using ctx.session.user.id as canonical id.
- Data sources:
  - Use the existing migrations (e.g., health_screening tables once available) and/or simple demo data in clinic schema.

Planned changes (high level):
- Implement:
  - getPublicHealthContent (publicProcedure):
    - Returns static or DB-backed educational content (non-PHI).
  - getMyHealthSummary (protectedProcedure):
    - Uses ctx.session.user.id → maps to patients.user_id.
    - Fetches non-sensitive summary: last screening date, vaccination status, etc.
- Patterns:
  - No Supabase Auth.
  - No PHI in logs.
  - All PHI access via protectedProcedure with clear authorization.

Phase B — Additional PDPA safeguards

Targets (cross-cutting):
- API routers (existing ones we touched).
- Jobs/logging.
- Any remaining areas where logs or fields risk PHI leakage.

Goals:
- Ensure we systematically:
  - Avoid logging PHI (e.g., NRIC, full medical notes, detailed symptoms).
  - Keep logs operational (ids, error codes, messages).
  - Avoid hard-coded NRIC/clinic IDs.

Planned checks/changes:
- Verify error/log statements in:
  - payments, telemedicine, feedback, jobs, booking.
- Where needed:
  - Redact or generalize logs:
    - Log only IDs, codes, high-level messages.
  - Add comments where PHI could be present to explicitly forbid logging it.
- Confirm:
  - No hard-coded NRIC-like values.
  - No use of service_role on client side (only in server/internal code).

Phase C — Typed DB clients (low-risk, high clarity)

Targets:
- Typed DB integration for:
  - payments
  - telemedicine_sessions
  - user_feedback
  - jobs (optional)

Goals:
- Introduce light-weight type safety around Supabase/Postgres calls without overhauling the stack.

Planned approach:
- If available:
  - Leverage existing generated types (e.g., types/database.types) or Prisma types.
- For each critical router:
  - Narrow any `as unknown` casts into interface shapes matching the migration schema.
    - Example: define minimal PaymentRecord, TelemedicineSessionRecord, FeedbackRecord to describe reads/inserts.
- Keep:
  - No runtime behavior changes.
  - Only safer typings and clearer field mapping.

Phase D — Tests (targeted, pragmatic)

Targets:
- Unit/integration tests for:
  - paymentRouter.createPaymentIntent.
  - telemedicineRouter.getTelemedicineSession.
  - feedbackRouter.submitFeedback.
  - jobs/queue core paths (enqueueJob, JobProcessor for happy-path and error-path behavior).

Goals:
- Provide executable, focused tests that:
  - Validate the contracts and error handling we’ve just aligned.
  - Use mocks/fakes for:
    - stripeService
    - dailyVideoProvider
    - Supabase clients (admin and ctx.supabase).
- Test design:
  - For each router:
    - Success path test.
    - Auth/ownership violation test.
    - Downstream failure mapping to TRPCError.

High-level order of execution

To keep changes small and reviewable:

1) Health router uplift:
   - Implement basic but correct health.router.ts with public and protected endpoints.

2) PDPA safeguards:
   - Sweep through touched files:
     - payment.router, telemedicine.router, feedback.router, jobs/queue, webhooks.
   - Normalize logs and comments to be PHI-safe.

3) Typed DB clients:
   - Add minimal type helpers/interfaces.
   - Apply to selected routers without changing runtime behavior.

4) Tests:
   - Add/extend tests to lock in behavior of the remediated flows.

No edits have been applied in this response; this is a precise, phase-structured plan ready for execution in subsequent steps while maintaining the meticulous, incremental change discipline already established.
