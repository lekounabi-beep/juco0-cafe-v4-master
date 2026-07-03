/**
 * Account page
 */

"use client";

import { AccountDashboard } from "@/features/account/components/AccountDashboard";
import { EspressoBackground } from "@/components/EspressoBackground";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";

export default function AccountPage() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <EspressoBackground />
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-full p-2 text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Λογαριασμός</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <AccountDashboard />
      </main>
    </div>
  );
}
