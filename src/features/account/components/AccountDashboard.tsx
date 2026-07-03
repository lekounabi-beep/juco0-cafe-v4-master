/**
 * Account Dashboard component
 */

"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProfile } from "@/features/account/hooks/useProfile";
import { useAuthStore } from "@/features/auth/store/auth-store";
import Link from "next/link";
import { User, MapPin, ShoppingBag, Heart, LogOut, ChevronRight } from "lucide-react";

export function AccountDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-primary">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{profile?.full_name || "Χρήστης"}</h2>
          <p className="text-sm text-white/60">{profile?.email || user?.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Link
          href="/account/profile"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-white">Προφίλ</p>
              <p className="text-xs text-white/50">Διαχειριστείτε τις πληροφορίες σας</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </Link>

        <Link
          href="/account/addresses"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-white">Διευθύνσεις</p>
              <p className="text-xs text-white/50">Διαχειριστείτε τις διευθύνσεις σας</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </Link>

        <Link
          href="/account/orders"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-white">Παραγγελίες</p>
              <p className="text-xs text-white/50">Δείτε το ιστορικό παραγγελιών</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </Link>

        <Link
          href="/account/favorites"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-white">Συνήθης Παραγγελία</p>
              <p className="text-xs text-white/50">Η συνήθης παραγγελία σας</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
      >
        <LogOut className="h-4 w-4" />
        <span>Αποσύνδεση</span>
      </button>
    </div>
  );
}
