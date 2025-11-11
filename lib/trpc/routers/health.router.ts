// lib/trpc/routers/health.router.ts
import { router, publicProcedure, protectedProcedure } from "../server";
import { TRPCError } from "@trpc/server";

/**
 * Health Router
 *
 * Provides:
 * - Public, non-PHI health and clinic content.
 * - Protected, minimal health summary for the authenticated user.
 *
 * NOTES:
 * - All protected endpoints MUST:
 *   - Use NextAuth/Prisma identity via ctx.session.user.id (surfaced as ctx.user.id here).
 *   - Avoid returning sensitive PHI beyond what is necessary for UX.
 * - No Supabase Auth usage is allowed.
 */

export const healthRouter = router({
  /**
   * Public, non-sensitive health content.
   * This can be static or backed by a simple CMS table in the future.
   */
  getPublicHealthContent: publicProcedure.query(async () => {
    return [
      {
        id: "screening-basics",
        title: "Health Screening Basics",
        summary:
          "Learn when to schedule common screenings for blood pressure, cholesterol, and diabetes.",
        category: "screening",
        link: "/health/screening-guide",
      },
      {
        id: "vaccination-adults",
        title: "Adult Vaccination Guide",
        summary:
          "Overview of recommended vaccinations for adults in Singapore, including flu and pneumococcal shots.",
        category: "vaccination",
        link: "/health/vaccinations",
      },
      {
        id: "chronic-care",
        title: "Chronic Care Support",
        summary:
          "How Gabriel Family Clinic supports patients with hypertension, diabetes, and high cholesterol.",
        category: "chronic_care",
        link: "/health/chronic-care",
      },
    ];
  }),

  /**
   * Minimal health summary for the logged-in user.
   *
   * Intent:
   * - Provide a quick-glance overview without exposing detailed clinical records.
   * - Example: last screening date, last vaccination date, chronic care enrollment.
   *
   * Implementation:
   * - Uses ctx.user.id (NextAuth) -> patients.user_id mapping.
   * - If supporting tables/columns are not yet present, this returns a safe placeholder shape.
   */
  getMyHealthSummary: protectedProcedure.query(async ({ ctx }) => {
    // Resolve patient by canonical user id.
    const { data: patient, error: patientError } = await ctx.supabase
      .from("patients")
      .select("id")
      .eq("user_id", ctx.user.id)
      .single();

    if (patientError || !patient) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "We could not find a patient profile linked to your account. Please contact the clinic.",
      });
    }

    // Placeholder implementation:
    // In future, join against structured screening/vaccination tables.
    // For now, return a stable, non-PHI structure.
    return {
      patientId: patient.id,
      lastScreeningDate: null as string | null,
      lastVaccinationDate: null as string | null,
      hasChronicCarePlan: false,
    };
  }),
});

