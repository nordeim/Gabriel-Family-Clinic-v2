// @/pages/dashboard/index.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patient Dashboard</CardTitle>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </CardHeader>
        <CardContent>
          <p>
            Welcome,{" "}
            <span className="font-semibold">{user?.email ?? "User"}</span>!
          </p>
          <p className="mt-4">This is a protected page.</p>
        </CardContent>
      </Card>
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
