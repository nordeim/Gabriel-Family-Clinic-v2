// pages/admin/login.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

// Minimal redirecting page: forward to the canonical /login page.
export default function AdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
