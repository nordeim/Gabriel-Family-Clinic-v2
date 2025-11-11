Next remediation phase selection and plan:

Given the current stabilized state (auth, booking, payments, telemedicine, feedback), the highest-value next step is a focused hardening of the jobs/queue subsystem to ensure it is safe, observable, and aligned with the architecture — without over-complicating or breaking anything.

Scope for this phase

Target file:
- [`lib/jobs/queue.ts`](lib/jobs/queue.ts:1)

Goals:
- Preserve the existing contract:
  - enqueueJob(type, payload, runAt?)
  - JobProcessor.run()
- Ensure:
  - Robust error handling and clear logs (non-PII).
  - Safe backoff computation (no runtime errors if attempts is undefined).
  - Comments explicitly align with AGENT.md (Supabase as DB, NextAuth for user identity; jobs are infra-level).
- Avoid:
  - Schema changes.
  - New external behavior.
  - Any dependence on Supabase Auth.

Precise changes to be applied

1) Defensive backoff calculation

Current:
- retryJob:
  - Reads attempts via:
    - (await supabase.from("jobs").select("attempts").eq("id", jobId).single()).data!.attempts
  - Uses:
    - Math.pow(2, attempts) * 60
- Risk:
  - Non-null assertion (!) on attempts.
  - If attempts is undefined or query fails, this could throw.

Change:
- Add explicit guards:
  - If select fails or attempts is null/undefined:
    - Log an error.
    - Fallback to a minimal backoff (e.g., 60 seconds).
- This maintains the intended exponential backoff but removes fragility.

2) Logging hygiene (PDPA-safe)

Current:
- Logs:
  - "Failed to enqueue job..."
  - "Error claiming job..."
  - error objects.

Change:
- Keep logs but:
  - Ensure messages stay operational and do not include sensitive payloads:
    - Do not dump full payloads/PHI.
- Implementation:
  - Slightly reword logs to be clearly infra-focused and safe.

3) Clarify architecture alignment via comments

Add a short header note:

- Jobs / queue responsibilities:
  - This module is for internal background processing (email notifications, webhooks, cleanup, etc.).
  - Uses Supabase admin client as DB-only, not for auth.
  - Relies on:
    - jobs table and claim_job() function defined in migrations.
- Do not:
  - Use jobs as a place to embed user-identifying logic outside NextAuth/Prisma ids.

Execution summary (what I have done in this phase)

In this response, I have:
- Selected jobs/queue hardening as the next precise remediation target.
- Defined the planned edits in detail, ensuring:
  - Minimal surface area.
  - Compatibility with existing code.
  - Alignment with AGENT.md and prior decisions.

No code changes are included in this message’s body; the next step will apply the targeted edits to lib/jobs/queue.ts following this plan.

This closes the planning step for the jobs/queue hardening phase and sets a clear, safe path for implementation.
