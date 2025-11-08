// pages/dashboard/profile/notifications.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
// import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-4xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <NotificationPreferences /> */}
            <p>(Placeholder for Notification Preferences Component)</p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
