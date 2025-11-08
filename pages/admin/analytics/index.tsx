// pages/admin/analytics/index.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
// import { PatientDemographicsChart } from "@/components/analytics/PatientDemographicsChart";
// import { AppointmentTrendsChart } from "@/components/analytics/AppointmentTrendsChart";

export default function AnalyticsDashboardPage() {
  // const { data: demographicsData } = api.reports.getPatientDemographicsReport.useQuery();
  // const { data: trendsData } = api.reports.getAppointmentTrendsReport.useQuery();

  return (
    <ProtectedRoute>
      <AdminLayout>
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold">Patient Demographics</h2>
            {/* <PatientDemographicsChart data={demographicsData} /> */}
            <p>(Placeholder for Demographics Chart)</p>
          </div>
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold">Appointment Trends</h2>
            {/* <AppointmentTrendsChart data={trendsData} /> */}
            <p>(Placeholder for Trends Chart)</p>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
