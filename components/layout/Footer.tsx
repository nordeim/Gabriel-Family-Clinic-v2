// @/components/layout/Footer.tsx
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <p className="text-sm text-neutral-500">
          &copy; {currentYear} Gabriel Family Clinic. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/terms" className="text-neutral-500 hover:text-primary">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-neutral-500 hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
