"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AdminDriverListItem } from "@/features/admin/types/admin-driver.types";

type DriverEditModalProps = {
  open: boolean;
  driver: AdminDriverListItem | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: { full_name: string; password: string }) => void;
};

export function DriverEditModal({
  open,
  driver,
  submitting = false,
  onClose,
  onSubmit,
}: DriverEditModalProps) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open && driver) {
      setFullName(driver.full_name);
      setPassword("");
    }
  }, [open, driver]);

  if (!open || !driver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Επεξεργασία οδηγού</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Όνομα *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Νέος κωδικός (προαιρετικό)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
              placeholder="Αφήστε κενό για να μείνει ο τρέχων"
              autoComplete="new-password"
            />
          </div>

          <p className="text-xs text-white/45">Username: @{driver.username}</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ full_name: fullName, password })}
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
