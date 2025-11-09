// lib/trpc/root.ts

import { router } from "./server";
import { patientRouter } from "./routers/patient.router";
import { appointmentRouter } from "./routers/appointment.router";
import { clinicRouter } from "./routers/clinic.router";
import { doctorRouter } from "./routers/doctor.router";
import { consultationRouter } from "./routers/consultation.router";
import { feedbackRouter } from "./routers/feedback.router";
import { telemedicineRouter } from "./routers/telemedicine.router";
import { healthRouter } from "./routers/health.router";
import { adminRouter } from "./routers/admin.router";
import { paymentRouter } from "./routers/payment.router";
import { userRouter } from "./routers/user.router"; // For user preferences

/**
 * This is the primary router for your entire server.
 * All feature routers are merged here to create a single type-safe API.
 */
export const appRouter = router({
  // PUBLIC & PATIENT-FACING ROUTERS
  patient: patientRouter,
  appointment: appointmentRouter,
  clinic: clinicRouter,
  payment: paymentRouter,
  user: userRouter,
  feedback: feedbackRouter,
  telemedicine: telemedicineRouter,
  health: healthRouter,

  // DOCTOR PORTAL ROUTERS
  doctor: doctorRouter,
  consultation: consultationRouter,

  // ADMIN PORTAL ROUTERS
  admin: adminRouter,
  // reports: reportsRouter, // Placeholder for a future phase
});

// Export the type definition of the API router.
// This is used by the tRPC client to provide end-to-end type safety.
export type AppRouter = typeof appRouter;
