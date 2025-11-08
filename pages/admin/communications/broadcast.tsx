// pages/admin/communications/broadcast.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
// import { MessageComposer } from "@/components/admin/MessageComposer";

export default function BroadcastPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Send Broadcast Message</h1>
          <p className="text-neutral-500">
            Send important announcements to patients of a specific clinic.
          </p>
          <div className="mt-6 max-w-2xl">
            {/* <MessageComposer /> */}
            <p>(Placeholder for Message Composer Component)</p>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
