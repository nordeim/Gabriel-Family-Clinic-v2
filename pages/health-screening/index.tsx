// pages/health-screening/index.tsx
import { api } from "@/lib/trpc/client";
// import { PackageCard } from "@/components/screening/PackageCard";

export default function HealthScreeningPage() {
  const { data: _packages, isLoading: _isLoading } = api.health.getScreeningPackages.useQuery();

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold">Health Screening Packages</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* {isLoading && <p>Loading packages...</p>}
        {packages?.map(pkg => <PackageCard key={pkg.id} package={pkg} />)} */}
        <p>(Placeholder for a grid of PackageCard components)</p>
      </div>
    </div>
  );
}
