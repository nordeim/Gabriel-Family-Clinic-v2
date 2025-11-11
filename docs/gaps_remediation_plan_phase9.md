Telemedicine, feedback, and jobs subsystems have been inspected and are ready for targeted remediation; below is the precise change plan (no edits applied in this step).

Objective

Extend the meticulous alignment to:
- telemedicine.router.ts
- feedback.router.ts
- jobs/queue.ts

ensuring consistency with:
- NextAuth + Prisma canonical identity.
- Supabase as managed Postgres (clinic.* schemas).
- Existing migrations (telemedicine_sessions, user_feedback, jobs).
- AGENT.md auth and architecture rules.

1) Telemedicine router — Alignment Plan

File:
- [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)

Current behavior:
- protectedProcedure getTelemedicineSession(appointmentId).
- Loads appointment: id, patient_id, doctor_id.
- Loads:
  - doctorProfile by ctx.supabase.from("doctors").where user_id=ctx.user.id.
  - patientProfile by ctx.supabase.from("patients").where user_id=ctx.user.id.
- Allows access if:
  - doctorProfile.id == appointment.doctor_id OR
  - patientProfile.id == appointment.patient_id.
- If no telemedicine_sessions row:
  - Creates new Daily.co room.
  - Inserts into telemedicine_sessions with many "..." placeholders:
    - clinic_id: "..."
    - patient_id: "..."
    - doctor_id: "..."
    - session_token: "..."
    - scheduled_start/ scheduled_end: "..."

Issues:
- Placeholder fields violate schema/AGENT rules.
- Missing clinic_id / patient_id / doctor_id from real appointment.
- session_token / scheduled_* left as "...".
- Uses ctx.supabase for DB, but that’s acceptable as DB client as long as identity is NextAuth.

Planned changes:
- Keep getTelemedicineSession contract stable:
  - Input: appointmentId (UUID).
  - Output: { roomUrl: string }.
- Ownership:
  - Use existing logic (doctorProfile/patientProfile via user_id) but ensure:
    - At least one of:
      - doctorProfile.id === appointment.doctor_id
      - patientProfile.id === appointment.patient_id
- When inserting telemedicine_sessions:
  - Populate from appointment + profiles:
    - appointment_id: input.appointmentId
    - clinic_id: appointment.clinic_id (requires extending select to include clinic_id)
    - patient_id: appointment.patient_id
    - doctor_id: appointment.doctor_id
    - session_token:
      - Generate a random, opaque token (e.g., uuid or crypto-random string).
    - room_url, room_name:
      - From Daily.co provider.
    - scheduled_start / scheduled_end:
      - Use appointment date/time fields when available OR
      - As a safe interim:
        - scheduled_start = now()
        - scheduled_end = now() + default duration (e.g., 30 minutes)
        - Document this as a placeholder until appointment schedule is fully wired.
- Error handling:
  - Use TRPCError consistently (NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR).
- No changes to identity model:
  - Authorization remains bound to ctx.user.id; telemedicine_sessions rows link to clinic.doctors/patients.

2) Feedback router — Alignment Plan

File:
- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)

Current behavior:
- protectedProcedure submitFeedback:
  - Input: rating?, feedbackText?, pageUrl, userAgent.
  - If both rating and feedbackText missing:
    - Returns success: true (no-op).
  - Else:
    - Inserts into user_feedback:
      - user_id: ctx.user.id
      - rating, feedback_text, page_url, user_agent.
- Issues:
  - Depends on user_feedback table existing, but otherwise:
    - Already uses NextAuth identity (ctx.user.id).
  - Error handling:
    - Throws generic Error instead of TRPCError.

Planned changes:
- Keep contract stable:
  - Still returns { success: true } or throws on errors.
- Enforcement:
  - Stay protectedProcedure (must be logged in).
  - Use ctx.session.user.id as canonical user_id (already done via ctx.user in this router context).
- Robustness:
  - Change error throwing to TRPCError with INTERNAL_SERVER_ERROR when insert fails.
- Optional enhancements (within scope of master plan):
  - Ensure rating, if provided, is integer 1-5 (zod can enforce).
  - Add created_at server default (via DB migration; already normal best practice).
- No parallel identity, no schema-violating placeholders.

3) Jobs queue — Alignment Plan

File:
- [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)

Current behavior:
- enqueueJob(type, payload, runAt?):
  - Uses createSupabaseAdminClient().
  - Inserts into jobs:
    - queue, payload, run_at.
- JobProcessor.run():
  - Uses supabase.rpc("claim_job") to atomically claim job.
  - Looks up handler from jobHandlers map.
  - Executes handler, then sets:
    - status: completed or failed.
    - For retries:
      - Reads attempts from jobs table.
      - Exponential backoff.

Issues:
- Depends on:
  - claim_job() SQL function existing (from enhancement docs/migrations).
- Identity:
  - Uses admin client (correct for internal worker).
  - No conflict with NextAuth identity (this is infra-level).
- Type-safety:
  - jobHandlers typed as Record<string, (payload: unknown) => Promise<void>>:
    - Acceptable for now.
- Main risk:
  - Lack of logging and stricter typing; but functionally aligned with architecture.

Planned changes (minimal, safe):

- Keep:
  - Supabase admin client usage for jobs; this is server-side infra, not user identity.
- Hardening:
  - Ensure error logging messages are clear and non-PII.
  - Ensure math for backoff is safe against undefined attempts (defensive guard).
- No behavior that conflicts with master auth decision.
- No schema changes.

Execution approach

Following the Meticulous Approach:
- Next step will consist of targeted apply_diff operations that:

1) For telemedicine.router.ts:
   - Extend appointment select to include clinic_id.
   - Resolve actual clinic_id, patient_id, doctor_id from appointment.
   - Replace "..." placeholders in telemedicine_sessions insert with real values or clearly documented safe defaults (session_token, scheduled_*).
   - Keep identity checks via user_id consistent with NextAuth.

2) For feedback.router.ts:
   - Switch thrown Error to TRPCError with INTERNAL_SERVER_ERROR plus safe message.
   - Confirm user_id usage (ctx.user.id) is aligned with canonical id (it is).

3) For jobs/queue.ts:
   - Add small defensive improvements without changing external API:
     - Guard on attempts when computing backoff.
     - Ensure logs remain non-sensitive.

No edits have been applied in this planning step. The next response will implement these precise diffs according to this plan.
