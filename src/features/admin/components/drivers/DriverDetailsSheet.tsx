"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin, RefreshCw, X } from "lucide-react";
import { getAdminDriverDetails } from "@app/actions/admin-drivers";
import type { AdminDriverDetails } from "@/features/admin/types/admin-driver.types";
import { DriverLiveMap } from "@/features/live-tracking-v2/components/DriverLiveMap";
import { cn } from "@/lib/utils";
import { DriverStateBadge } from "./DriverStateBadge";

type DriverDetailsSheetProps = {
  driverId: string | null;
  onClose: () => void;
};

export function DriverDetailsSheet({ driverId, onClose }: DriverDetailsSheetProps) {
  const [driver, setDriver] = useState<AdminDriverDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  const loadDetails = useCallback(
    async (silent = false) => {
      if (!driverId) return;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await getAdminDriverDetails(driverId);
        if (!result.success) {
          setError(result.error);
          setDriver(null);
          return;
        }
        setDriver(result.driver);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load driver");
        setDriver(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [driverId],
  );

  useEffect(() => {
    if (!driverId) {
      setDriver(null);
      setError(null);
      setVisible(false);
      return;
    }

    setVisible(true);
    void loadDetails();

    const timer = window.setInterval(() => {
      void loadDetails(true);
    }, 8_000);

    return () => window.clearInterval(timer);
  }, [driverId, loadDetails]);

  useEffect(() => {
    if (!driverId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [driverId, handleClose]);

  useEffect(() => {
    if (!driverId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [driverId]);

  if (!driverId) return null;

  const driverLocation = driver?.location
    ? { lat: driver.location.lat, lng: driver.location.lng }
    : undefined;

  const destination =
    driver?.active_delivery?.destination_lat != null &&
    driver.active_delivery.destination_lng != null
      ? {
          lat: driver.active_delivery.destination_lat,
          lng: driver.active_delivery.destination_lng,
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Κλείσιμο παρακολούθησης"
        onClick={handleClose}
        className={cn(
          "absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          driver?.full_name ? `Παρακολούθηση ${driver.full_name}` : "Παρακολούθηση οδηγού"
        }
        className={cn(
          "relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#080808] shadow-2xl transition-transform duration-200 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="shrink-0 border-b border-white/10 px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Πίσω στους οδηγούς</span>
              <span className="sm:hidden">Πίσω</span>
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-white md:text-lg">
                {driver?.full_name ?? "Φόρτωση..."}
              </h2>
              {driver ? <p className="truncate text-xs text-white/45">@{driver.username}</p> : null}
            </div>

            <button
              type="button"
              onClick={() => void loadDetails()}
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/15"
              aria-label="Ανανέωση"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-white/10">
            {loading && !driver ? (
              <div className="flex h-[min(52vh,420px)] items-center justify-center bg-white/[0.03] text-white/60">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : driverLocation ? (
              <DriverLiveMap
                className="h-[min(52vh,420px)] w-full min-h-[280px] md:min-h-[360px]"
                driverLocation={driverLocation}
                destination={destination}
                showDriverTrail={false}
              />
            ) : (
              <div className="flex h-[min(40vh,320px)] min-h-[220px] flex-col items-center justify-center gap-3 bg-white/[0.03] px-6 text-center text-white/50">
                <div className="rounded-full bg-white/10 p-4">
                  <MapPin className="h-7 w-7 opacity-70" />
                </div>
                <p className="text-sm leading-relaxed">
                  Ο οδηγός είναι offline — χωρίς πρόσφατη θέση GPS
                </p>
              </div>
            )}

            {driver ? (
              <div className="absolute left-4 top-4 z-10">
                <DriverStateBadge
                  state={driver.operational_state}
                  className="shadow-lg backdrop-blur-sm"
                />
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            {error ? (
              <p className="text-sm text-red-300">{error}</p>
            ) : driver ? (
              <div className="space-y-4">
                {!driver.is_active ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
                    Λογαριασμός απενεργοποιημένος
                  </p>
                ) : null}

                {driver.location ? (
                  <p className="text-xs text-white/45">
                    Τελευταία ενημέρωση θέσης:{" "}
                    <span className="text-white/65">
                      {new Date(driver.location.recorded_at).toLocaleString("el-GR")}
                    </span>
                    {driver.location.source === "assignment" ? " · ενεργή παράδοση" : ""}
                  </p>
                ) : null}

                {driver.active_delivery ? (
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 md:p-5">
                    <h3 className="text-sm font-semibold text-orange-100">Ενεργή παράδοση</h3>
                    <dl className="mt-3 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                      <div>
                        <dt className="text-white/45">Παραγγελία</dt>
                        <dd className="font-medium text-white">
                          #{driver.active_delivery.order_number}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/45">Κατάσταση</dt>
                        <dd>{driver.active_delivery.status}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-white/45">Πελάτης</dt>
                        <dd>{driver.active_delivery.customer_name}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-white/45">Διεύθυνση</dt>
                        <dd>{driver.active_delivery.address}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    Δεν υπάρχει ενεργή παράδοση αυτή τη στιγμή.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md md:px-5">
          <button
            type="button"
            onClick={handleClose}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <X className="h-4 w-4" />
            Κλείσιμο παρακολούθησης
          </button>
        </footer>
      </div>
    </div>
  );
}
