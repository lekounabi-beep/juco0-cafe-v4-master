"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { createDriver } from "@app/actions/create-driver";
import { setAdminDriverActive, updateAdminDriver } from "@app/actions/admin-drivers";
import { AdminContentContainer } from "@/features/admin/components/AdminContentContainer";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminDriverCard } from "@/features/admin/components/drivers/AdminDriverCard";
import { DriverCreateModal } from "@/features/admin/components/drivers/DriverCreateModal";
import { DriverCredentialsModal } from "@/features/admin/components/drivers/DriverCredentialsModal";
import { DriverDetailsSheet } from "@/features/admin/components/drivers/DriverDetailsSheet";
import { DriverEditModal } from "@/features/admin/components/drivers/DriverEditModal";
import { DriverSummaryCards } from "@/features/admin/components/drivers/DriverSummaryCards";
import { useAdminDriversSync } from "@/features/admin/hooks/useAdminDriversSync";
import type { AdminDriverListItem } from "@/features/admin/types/admin-driver.types";

export function AdminDriversWorkspace() {
  const { drivers, summary, loading, refresh } = useAdminDriversSync();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    username: string;
  } | null>(null);

  const [detailsDriverId, setDetailsDriverId] = useState<string | null>(null);
  const [editDriverId, setEditDriverId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const editDriver = useMemo(
    () => drivers.find((d) => d.id === editDriverId) ?? null,
    [drivers, editDriverId],
  );

  const handleCreate = async () => {
    if (!createName.trim() || !createPassword) {
      toast.error("Συμπλήρωσε όνομα και κωδικό.");
      return;
    }

    setCreating(true);
    const createdFullName = createName.trim();
    try {
      const result = await createDriver({
        full_name: createdFullName,
        password: createPassword,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setShowCreateModal(false);
        setCreateName("");
        setCreatePassword("");
        setCreatedCredentials({
          fullName: createdFullName,
          username: result.username,
        });
        await refresh();
      }
    } catch (error) {
      console.error("Error creating driver:", error);
      toast.error("Αποτυχία δημιουργίας οδηγού.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (driverId: string, nextActive: boolean) => {
    setTogglingId(driverId);
    try {
      const result = await setAdminDriverActive(driverId, nextActive);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextActive ? "Οδηγός ενεργοποιήθηκε" : "Οδηγός απενεργοποιήθηκε");
      await refresh();
    } catch (error) {
      console.error("Error toggling driver:", error);
      toast.error("Αποτυχία ενημέρωσης κατάστασης.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditSubmit = async (payload: { full_name: string; password: string }) => {
    if (!editDriverId) return;

    if (!payload.full_name.trim()) {
      toast.error("Το όνομα είναι υποχρεωτικό.");
      return;
    }

    setSavingEdit(true);
    try {
      const updatePayload: { full_name: string; password?: string } = {
        full_name: payload.full_name.trim(),
      };
      if (payload.password.trim()) {
        updatePayload.password = payload.password;
      }

      const result = await updateAdminDriver(editDriverId, updatePayload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Οδηγός ενημερώθηκε");
      setEditDriverId(null);
      await refresh();
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("Αποτυχία ενημέρωσης οδηγού.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      <AdminContentContainer className="py-8">
        <AdminPageHeader
          title="Drivers"
          description={
            <>
              <p>{loading ? "Φόρτωση..." : `${summary.total} οδηγοί`}</p>
              <p className="mt-1">
                Διαχειρίσου οδηγούς, παρακολούθησε κατάσταση και θέση σε πραγματικό χρόνο.
              </p>
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Ανανέωση
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <Plus className="h-4 w-4" />
                Νέος οδηγός
              </button>
            </>
          }
        />

        <div className="mb-6">
          <DriverSummaryCards summary={summary} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-white/60">Φόρτωση οδηγών...</p>
            </div>
          </div>
        ) : drivers.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/15 p-4 text-primary">
              <Truck className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white">Δεν υπάρχουν οδηγοί</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Δημιούργησε τον πρώτο οδηγό με όνομα και κωδικό. Μπορεί να συνδεθεί αμέσως στο driver
              app.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Νέος οδηγός
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drivers.map((driver: AdminDriverListItem) => (
              <AdminDriverCard
                key={driver.id}
                driver={driver}
                onView={setDetailsDriverId}
                onEdit={setEditDriverId}
                onToggleActive={handleToggleActive}
                toggling={togglingId === driver.id}
              />
            ))}
          </div>
        )}
      </AdminContentContainer>

      <DriverCreateModal
        open={showCreateModal}
        fullName={createName}
        password={createPassword}
        submitting={creating}
        onFullNameChange={setCreateName}
        onPasswordChange={setCreatePassword}
        onClose={() => setShowCreateModal(false)}
        onSubmit={() => void handleCreate()}
      />

      <DriverEditModal
        open={editDriverId != null}
        driver={editDriver}
        submitting={savingEdit}
        onClose={() => setEditDriverId(null)}
        onSubmit={handleEditSubmit}
      />

      <DriverDetailsSheet driverId={detailsDriverId} onClose={() => setDetailsDriverId(null)} />

      <DriverCredentialsModal
        open={createdCredentials != null}
        fullName={createdCredentials?.fullName ?? ""}
        username={createdCredentials?.username ?? ""}
        onClose={() => setCreatedCredentials(null)}
      />
    </>
  );
}
