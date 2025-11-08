// pages/dashboard/telemedicine/consultation/[appointmentId].tsx
"use client";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VideoCall } from "@/components/telemedicine/VideoCall";
import { api } from "@/lib/trpc/client";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function TelemedicineConsultationPage() {
  const router = useRouter();
  const { appointmentId } = router.query;
  const { user } = useAuth();

  const { data, isLoading, error } =
    api.telemedicine.getTelemedicineSession.useQuery(
      { appointmentId: appointmentId as string },
      {
        enabled: !!appointmentId && !!user,
        retry: false, // Don't retry on error
      }
    );

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold">Video Consultation</h1>
        <div className="mt-6">
          {isLoading && <LoadingSpinner size={48} />}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          {data?.roomUrl && (
            <VideoCall
              roomUrl={data.roomUrl}
              displayName={user?.user_metadata?.full_name ?? "Patient"}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
