// pages/dashboard/vaccinations/index.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/trpc/client";
// import { VaccinationRecordCard } from "@/components/vaccination/VaccinationRecordCard";

export default function VaccinationsPage() {
  const { data: records, isLoading } = api.health.getPatientVaccinations.useQuery();

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold">My Vaccination Records</h1>
        <div className="mt-8 space-y-4">
          {/* {isLoading && <p>Loading records...</p>}
          {records?.map(rec => <VaccinationRecordCard key={rec.id} record={rec} />)} */}
          <p>(Placeholder for a list of VaccinationRecordCard components)</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
