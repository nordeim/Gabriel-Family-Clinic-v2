// lib/trpc/routers/health.router.ts
import { router, publicProcedure, protectedProcedure } from "../server";

export const healthRouter = router({
  getScreeningPackages: publicProcedure.query(async ({ ctx }) => {
    // Logic to fetch all active health_screening_packages
    return [];
  }),

  getPatientVaccinations: protectedProcedure.query(async ({ ctx }) => {
    // Logic to fetch all vaccination_records for the logged-in user's patient profile
    return [];
  }),
});
