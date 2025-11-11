Typed adoption for payments completed (non-breaking), creating a precise contract between DB schema and code; this is a clean micro-step per the plan.

What changed in this step

1) paymentRouter now uses typed result for payments insert

File:
- [`lib/trpc/routers/payment.router.ts`](lib/trpc/routers/payment.router.ts:1)

Previously:
- Inserted into payments and did:
  - .select("id").single();
- Relied on runtime shape; TypeScript did not enforce the returned structure.

Now:
- Still inserts the same fields into payments (no behavioral change).
- Refined the select typing:

  - .select("id").single<Pick<PaymentRecord, "id">>();

Where PaymentRecord comes from:
- [`types/db.ts`](types/db.ts:1)
- Imported via:
  - import type { PaymentRecord } from "@/types/db";

Impact:
- paymentRecord is now known to have:
  - id: string
- Downstream usage:
  - paymentRecord.id is typed and validated at compile-time.
  - Metadata wiring (paymentId: String(paymentRecord.id)) and subsequent updates remain correct and now type-safe.

Why this is a good micro-step

- Non-invasive:
  - No runtime logic changed.
  - Only the expected shape of the Supabase select is made explicit.
- Aligns with:
  - The new typed DB helpers in types/db.ts.
  - ESLint’s preference for import type.
- Sets the pattern:
  - Other routers can safely follow this approach (telemedicine sessions, jobs, feedback) in similarly small, reviewable steps.

Next micro-steps (to be applied in subsequent small patches)

1) Typed adoption for other modules (per pattern used here)
- telemedicine.router.ts:
  - Use TelemedicineSessionRecord for existingSession reads:
    - .single<Pick<TelemedicineSessionRecord, "room_url">>() or similar.
- jobs/queue.ts:
  - Ensure JobRecord from types/db.ts or existing types module is consistently used.
- feedback.router.ts:
  - Optionally adopt UserFeedbackRecord for read paths if introduced.

2) PDPA/logging confirmation
- For each touched module (payments, telemedicine, feedback, health, jobs, webhook):
  - Verify logs only include IDs, codes, generic messages.
  - Add/confirm comments forbidding PHI in logs at sensitive boundaries.

3) Tests
- Add Jest-based tests (with mocks) as separate, focused change sets for:
  - paymentRouter.createPaymentIntent.
  - telemedicineRouter.getTelemedicineSession.
  - feedbackRouter.submitFeedback.
  - JobProcessor / enqueueJob.
  - healthRouter.getPublicHealthContent / getMyHealthSummary.

This step successfully advances typed safety for a critical path (payments) while preserving the stable, meticulously aligned baseline you’ve approved.
