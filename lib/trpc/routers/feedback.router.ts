// @/lib/trpc/routers/feedback.router.ts
import { router, protectedProcedure } from "../server";
import { z } from "zod";

export const feedbackRouter = router({
  submitFeedback: protectedProcedure
    .input(z.object({
      rating: z.number().min(1).max(5).optional(),
      feedbackText: z.string().max(2000).optional(),
      pageUrl: z.string().url(),
      userAgent: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.rating && !input.feedbackText) {
        // Don't save empty feedback
        return { success: true };
      }

      const { error } = await ctx.supabase.from("user_feedback").insert({
        user_id: ctx.user.id, // NextAuth/Prisma canonical user id
        rating: input.rating,
        feedback_text: input.feedbackText,
        page_url: input.pageUrl,
        user_agent: input.userAgent,
      });
 
      if (error) {
        // PDPA: do not log full feedback text or other PHI. If logging is added,
        // include only technical details (user_id, page_url, error codes/messages).
        console.error("Failed to save user feedback", {
          userId: ctx.user.id,
          pageUrl: input.pageUrl,
          message: error.message,
          code: error.code,
        });
        // Use TRPC-friendly error signaling
        throw new (await import("@trpc/server")).TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not submit your feedback at this time.",
        });
      }

      // Optional: Send a notification (Slack/email/etc.) via jobs/queue.

      return { success: true };
    }),
});
