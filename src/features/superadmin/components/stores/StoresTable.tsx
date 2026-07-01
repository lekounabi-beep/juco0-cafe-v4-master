"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SuperAdminStoreRow } from "@/features/superadmin/types/superadmin-stats.types";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeDateTimeString } from "@/features/superadmin/i18n/messages";

export function StoresTable({
  stores,
  loading,
}: {
  stores: SuperAdminStoreRow[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const { t, locale } = useSuperAdminT();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address?.toLowerCase().includes(q) ?? false) ||
        s.id.toLowerCase().includes(q),
    );
  }, [query, stores]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("stores.searchPlaceholder")}
            className="border-zinc-800 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <p className="text-xs text-zinc-500">{t("stores.metricsNote")}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500">{t("stores.col.store")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.status")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.ordersToday")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.revenue")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.drivers")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.version")}</TableHead>
              <TableHead className="text-zinc-500">{t("stores.col.lastActivity")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                  {t("stores.loading")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                  {t("stores.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((store) => (
                <TableRow key={store.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">{store.name}</p>
                      <p className="text-xs text-zinc-500">{store.address ?? store.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        store.status === "active"
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-zinc-600 text-zinc-400"
                      }
                    >
                      {store.status === "active"
                        ? t("stores.status.active")
                        : store.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300">{store.ordersToday ?? "—"}</TableCell>
                  <TableCell className="text-zinc-300">
                    {store.revenueToday != null ? `€${store.revenueToday}` : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-300">{store.driversActive ?? "—"}</TableCell>
                  <TableCell className="text-zinc-400">1.0.0</TableCell>
                  <TableCell className="text-zinc-300">
                    {localeDateTimeString(locale, store.lastActivity)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
