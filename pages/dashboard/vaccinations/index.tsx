// pages/dashboard/vaccinations/index.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/trpc/client";
// import { VaccinationRecordCard } from "@/components/vaccination/VaccinationRecordCard";

export default function VaccinationsPage() {
  // PDPA / API NOTE:
  // - The health router does not yet expose `getPatientVaccinations`.
  // - To keep types and build clean while the API is being finalized,
  //   we render a static placeholder instead of calling a non-existent procedure.
  // - When the typed endpoint is implemented in health.router.ts, re-introduce
  //   the corresponding api.health.getPatientVaccinations.useQuery() call here.
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold">My Vaccination Records</h1>
        <div className="mt-8 space-y-4">
          <p className="text-gray-600">
            Vaccination history is coming soon. This page is intentionally static until
            the backend endpoint is implemented and wired through tRPC.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
