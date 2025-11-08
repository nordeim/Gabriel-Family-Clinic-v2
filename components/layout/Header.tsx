// @/components/layout/Header.tsx
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-bold text-xl text-primary">
            GFC v2.0
          </Link>
          {/* Future navigation links will go here */}
        </div>
        <div>
          <Link href="/login">
            <Button variant="outline">Login</Button>
          </Link>
          {/* This will later be a conditional user navigation dropdown */}
        </div>
      </div>
    </header>
  );
}
