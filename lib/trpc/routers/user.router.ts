// lib/trpc/routers/user.router.ts
import { router, protectedProcedure } from "../server";
import { z } from "zod";

export const userRouter = router({
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("users")
      .select("notification_preferences")
      .eq("id", ctx.user.id)
      .single();
    return data?.notification_preferences ?? {};
  }),

  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      smsEnabled: z.boolean(),
      emailEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("users")
        .update({
          notification_preferences: {
            sms: { appointment_reminders: input.smsEnabled },
            email: { appointment_reminders: input.emailEnabled },
          },
        })
        .eq("id", ctx.user.id);
      
      if (error) throw new Error("Failed to update preferences.");
      return { success: true };
    }),
});
