// @/pages/dashboard/index.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
// import { AppointmentSummary } from "@/components/patient/AppointmentSummary";
// import { MedicalHistory } from "@/components/patient/MedicalHistory";

function DashboardPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold">Your Health Dashboard</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>{/* <AppointmentSummary /> */} (Placeholder for Appointment Summary)</div>
        <div>{/* <MedicalHistory /> */} (Placeholder for Medical History)</div>
      </div>
    </div>
  );
}

export default function ProtectedDashboard() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
