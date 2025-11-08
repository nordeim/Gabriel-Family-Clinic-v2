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
        user_id: ctx.user.id,
        rating: input.rating,
        feedback_text: input.feedbackText,
        page_url: input.pageUrl,
        user_agent: input.userAgent,
      });

      if (error) {
        console.error("Failed to save user feedback:", error);
        throw new Error("Could not submit your feedback at this time.");
      }

      // Optional: Send a notification to a Slack channel about new feedback
      // await notifyTeamOfFeedback(input);

      return { success: true };
    }),
});
