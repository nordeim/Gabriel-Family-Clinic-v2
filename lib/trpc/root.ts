// lib/trpc/root.ts

import { router, publicProcedure } from "./server";
import { patientRouter } from "./routers/patient.router";
import { appointmentRouter } from "./routers/appointment.router";
import { clinicRouter } from "./routers/clinic.router";
import { doctorRouter } from "./routers/doctor.router";
import { consultationRouter } from "./routers/consultation.router";
import { adminRouter } from "./routers/admin.router";
import { paymentRouter } from "./routers/payment.router";
import { userRouter } from "./routers/user.router"; // For user preferences

/**
 * This is the primary router for your entire server.
 * All feature routers are merged here to create a single type-safe API.
 */
export const appRouter = router({
  /**
   * A simple public health check endpoint to confirm the API is responsive.
   */
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date() };
  }),

  // =================================================================
  // PUBLIC & PATIENT-FACING ROUTERS
  // These are accessible to the public or authenticated patients.
  // =================================================================
  patient: patientRouter,         // Patient-specific data
  appointment: appointmentRouter, // Booking flow
  clinic: clinicRouter,           // Public clinic info (e.g., queue status)
  payment: paymentRouter,         // Payment processing
  user: userRouter,               // User settings (e.g., notification preferences)

  // =================================================================
  // DOCTOR PORTAL ROUTERS
  // These are protected and accessible only to users with a 'doctor' role.
  // =================================================================
  doctor: doctorRouter,
  consultation: consultationRouter,
  // prescription: prescriptionRouter, // Placeholder for a future phase
  // mc: mcRouter, // Placeholder for a future phase

  // =================================================================
  // ADMIN PORTAL ROUTERS
  // These are protected and accessible only to users with an 'admin' role.
  // =================================================================
  admin: adminRouter,
  // reports: reportsRouter, // Placeholder for a future phase
});

// Export the type definition of the API router.
// This is used by the tRPC client to provide end-to-end type safety.
export type AppRouter = typeof appRouter;
