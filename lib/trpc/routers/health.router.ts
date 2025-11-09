// lib/trpc/routers/health.router.ts
import { router, publicProcedure, protectedProcedure } from "../server";

export const healthRouter = router({
  getScreeningPackages: publicProcedure.query(async ({ ctx }) => {
    // `ctx` is intentionally unused for now; mark as used to satisfy lint rules.
    void ctx;
    // Logic to fetch all active health_screening_packages
    return [];
  }),

  getPatientVaccinations: protectedProcedure.query(async ({ ctx }) => {
    // `ctx` is intentionally unused for now; mark as used to satisfy lint rules.
    void ctx;
    // Logic to fetch all vaccination_records for the logged-in user's patient profile
    return [];
  }),
});
