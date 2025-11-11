Health router uplift, PDPA-safe logging posture, and jobs/telemedicine/feedback/payment alignment are now coherently planned and partially implemented. This message consolidates the current state as a stable baseline and defines the next precise steps without introducing further edits.

Executed in this wave

1) Telemedicine router (implemented)

- File: [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)

Status:
- Uses protectedProcedure (NextAuth-protected).
- Verifies appointment exists and loads:
  - id, clinic_id, patient_id, doctor_id.
- Resolves caller identity via:
  - doctors.user_id = ctx.user.id
  - patients.user_id = ctx.user.id
- Authorizes only if:
  - doctorProfile.id === appointment.doctor_id
  - OR patientProfile.id === appointment.patient_id
- Reuses existing telemedicine_sessions if present.
- On first access:
  - Creates Daily.co room.
  - Inserts telemedicine_sessions with:
    - appointment_id, clinic_id, patient_id, doctor_id
    - room_url, room_name
    - session_token (opaque)
    - scheduled_start/ scheduled_end (safe defaults)
- Uses TRPCError consistently.
- No placeholder values; aligned with 009_system_and_integration_tables.sql and AGENT.md auth rules.

2) Feedback router (implemented)

- File: [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)

Status:
- protectedProcedure; tied to NextAuth user.
- No-op when both rating and feedbackText are empty.
- Inserts into user_feedback:
  - user_id: ctx.user.id
  - rating, feedback_text, page_url, user_agent
- On error:
  - Logs operational details.
  - Throws TRPCError(INTERNAL_SERVER_ERROR) with safe message.
- Fully identity-aligned and TRPC-consistent.

3) Jobs/queue subsystem hardening (implemented)

- File: [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)

Status:
- Uses createSupabaseAdminClient (DB-only, no Supabase Auth).
- Header docs:
  - Explicitly state jobs are infra-level.
  - Must not log PHI or rely on non-canonical identity.
- enqueueJob:
  - Inserts queue, payload, run_at.
  - On error:
    - Logs only type and error code/message (no payload).
- JobProcessor.run:
  - Uses rpc("claim_job") to atomically claim jobs.
  - Handles:
    - No job (PGRST116) silently.
    - Other errors with structured log.
  - If no handler:
    - markAsFailed with clear reason.
  - Executes handler; on failure:
    - If attempts + 1 >= MAX_ATTEMPTS:
      - markAsFailed.
    - Else:
      - retryJob with safe backoff.
- markAsCompleted / markAsFailed:
  - Structured, non-PII logging.
- retryJob:
  - Safely derives attempts:
    - Fetches from DB if not provided.
    - Defaults to 0 on error.
  - Computes backoff = 2^attempts * 60 seconds.
  - Updates run_at and status, logs if update fails.
- Result:
  - Robust, PDPA-safe, and aligned with design docs and auth decision, without breaking existing semantics.

4) Payments and Stripe webhook (previously implemented, reaffirmed)

- File: [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)
  - Auth: protectedProcedure (NextAuth).
  - Ownership: verifies appointment belongs to current user via patients.user_id = ctx.user.id.
  - Schema: creates payments row with correct fields (no placeholders).
  - Stripe: PaymentIntent metadata includes paymentId; payment_intent_id stored.
- File: [`pages/api/webhooks/stripe.ts`](pages/api/webhooks/stripe.ts:1)
  - Verifies signature.
  - Uses metadata.paymentId to update:
    - status: "completed"
    - transaction_reference: latest_charge
  - Minimal, safe, idempotent behavior.

5) Auth and docs (previously implemented, reaffirmed)

- File: [`AGENT.md`](AGENT.md:10)
  - Now clearly encodes:
    - NextAuth + Prisma as single source of truth.
    - Supabase as managed Postgres (no Supabase Auth split-brain).
    - DO / DO NOT rules for identity, clinic/users, NRIC handling.
- File: [`lib/auth/actions.ts`](lib/auth/actions.ts:1)
  - Supabase-auth signup path disabled and documented.
  - Prevents reintroduction of divergent identities.

PDPA and logging posture

Across updated modules:
- Errors are logged in an operationally useful but PHI-safe manner:
  - Codes, IDs, and general messages.
  - Avoid logging clinical details, NRIC, or personal notes.
- Supabase service_role/admin usage is confined to:
  - Server-side code (jobs, webhooks), not client.

Next focused phases (ready for execution as separate steps)

Not implemented in this message, but cleanly queued:

1) Health router uplift:
- Implement minimal but correct endpoints in:
  - [`lib/trpc/routers/health.router.ts`](lib/trpc/routers/health.router.ts:1)
- Public health content (non-PHI, publicProcedure).
- Protected health summary for logged-in users (protectedProcedure using ctx.session.user.id).

2) Additional PDPA safeguards (sweep):
- Systematic review of:
  - Routers, webhooks, jobs.
- Small edits where needed:
  - Tighten logs.
  - Add comments where PHI could appear, explicitly forbidding logging.

3) Typed DB helpers:
- Introduce minimal interfaces for:
  - payments, telemedicine_sessions, user_feedback, jobs.
- Use them to replace loose any/unknown casts in critical paths.

4) Tests:
- Add targeted Jest/Playwright tests for:
  - paymentRouter, telemedicineRouter, feedbackRouter.
  - jobs/queue basic behavior.
- Mock external services (Stripe, Daily, Supabase) per best practices.

Final note

At this point, the auth model, booking, payments, telemedicine, feedback, and jobs subsystems form a coherent, production-aligned baseline. The next phases (health router uplift, PDPA sweep, stronger typing, and tests) can each be implemented as small, isolated change sets on top of this stable foundation, maintaining the meticulous, incremental approach established throughout this remediation.
