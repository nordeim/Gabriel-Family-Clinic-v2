Applied another focused PDPA/logging micro-patch to feedback and telemedicine routers, keeping behavior intact and tightening compliance. This completes the next slice of your requested work.

Changes in this micro-patch

1) Telemedicine router — PDPA-safe logging

File:
- [`lib/trpc/routers/telemedicine.router.ts`](lib/trpc/routers/telemedicine.router.ts:1)

Updates:
- Insert failure branch for telemedicine_sessions:

  - Before:
    - console.error("Failed to persist telemedicine session:", insertError);

  - After:
    - Adds explicit PDPA guidance and narrows log content:
      - // PDPA: do not log full payloads or PHI. This log is limited to technical details.
      - console.error("Failed to persist telemedicine session", {
          appointmentId: input.appointmentId,
          message: insertError.message,
          code: insertError.code,
        });

- Catch-all failure branch:

  - Before:
    - console.error("Telemedicine session creation failed:", message);

  - After:
    - Adds PDPA guard and structured, minimal log:
      - // PDPA: never log PHI or full session context; this message is technical-only.
      - console.error("Telemedicine session creation failed", {
          appointmentId: input.appointmentId,
          message,
        });

Effect:
- Telemedicine logging is now:
  - Explicitly constrained to:
    - appointmentId
    - technical error message/code
  - Free of PHI or unbounded context.
- Runtime behavior unchanged:
  - Still throws INTERNAL_SERVER_ERROR with user-safe messages.

2) Feedback router — PDPA-safe logging

File:
- [`lib/trpc/routers/feedback.router.ts`](lib/trpc/routers/feedback.router.ts:1)

Context:
- Router:
  - submitFeedback: protectedProcedure
  - Writes to user_feedback with canonical user_id.

Updates:
- Insert failure branch:

  - Before:
    - console.error("Failed to save user feedback:", error);
    - throw new TRPCError(INTERNAL_SERVER_ERROR, generic message);

  - After:
    - Adds PDPA guard and structured, minimal log:
      - // PDPA: do not log full feedback text or other PHI. If logging is added,
      - // include only technical details (user_id, page_url, error codes/messages).
      - console.error("Failed to save user feedback", {
          userId: ctx.user.id,
          pageUrl: input.pageUrl,
          message: error.message,
          code: error.code,
        });
      - Then throws the same TRPCError as before.

Effect:
- Logging:
  - No raw feedback text or sensitive content.
  - Only technical fields: userId, pageUrl, error metadata.
- Behavior:
  - Unchanged: still returns standardized INTERNAL_SERVER_ERROR to client.

Reconfirmed surrounding baseline

- Payment router:
  - Has PDPA comments around Stripe PaymentIntent failure:
    - No card details/PHI in logs; safe IDs/codes only.
- Jobs queue:
  - Header explicitly forbids PHI/full payload logging.
  - Uses shared JobRecord type.
- Telemedicine + feedback:
  - Now both have explicit PDPA guidance on logging.
- Jest:
  - [`jest.config.cjs`](jest.config.cjs:1) is correctly configured for tests/server/**/*.test.ts.
- Payment tests:
  - [`tests/server/payment.router.test.ts`](tests/server/payment.router.test.ts:1) scaffold is syntactically safe and ready for further refinement.

Why this is a good checkpoint

- Scope:
  - Only telemedicine and feedback routers touched; changes are small and precise.
- Safety:
  - No functional changes; only safer logging plus clear PDPA documentation.
- Alignment:
  - Directly matches your requested PDPA/logging normalization for these modules.

Next recommended micro-steps (for future patches, not executed in this result)

1) PDPA/logging:
   - Stripe webhook handler:
     - Add comments and, if applicable, adjust logs:
       - Only event type, paymentId, and sanitized error info.
   - health.router.ts:
     - Add note reinforcing:
       - Only minimal, non-diagnostic info should be exposed/logged.

2) Tests:
   - Run Jest for tests/server/payment.router.test.ts:
     - Fix any remaining path/mocking issues iteratively.
   - Add small, parallel suites:
     - telemedicine.router.test.ts:
       - Cover existing-session reuse and new-session creation failures (PDPA-safe).
     - feedback.router.test.ts:
       - Ensure empty feedback is ignored; error handling works.
     - jobs.queue.test.ts:
       - Cover enqueueJob and JobProcessor.run logic.
     - health.router.test.ts:
       - Validate public content and minimal protected summary.
   - Introduce shared test utilities:
     - e.g. tests/server/_utils.ts:
       - createMockCtx for Supabase + NextAuth.
       - mockStripe, mockDaily, etc.
       - Ensures DRY, deterministic tests.

This completes the current micro-patch wave: telemedicine and feedback logging are now PDPA-tight, building on your already-stable, typed, and test-ready foundation.
