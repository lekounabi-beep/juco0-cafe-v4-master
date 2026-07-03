"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SUPERADMIN_NAV_ITEMS } from "@/features/superadmin/config/superadmin-nav";
import { SuperAdminLanguageSwitch } from "@/features/superadmin/components/SuperAdminLanguageSwitch";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import type { SuperAdminMessageKey } from "@/features/superadmin/i18n/messages";

const NAV_KEY_MAP: Record<string, SuperAdminMessageKey> = {
  overview: "nav.overview",
  stores: "nav.stores",
  orders: "nav.orders",
  drivers: "nav.drivers",
  customers: "nav.customers",
  payments: "nav.payments",
  monitoring: "nav.monitoring",
  logs: "nav.logs",
  flags: "nav.flags",
  system: "nav.system",
  settings: "nav.settings",
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useSuperAdminT();

  return (
    <nav className="flex flex-col gap-1" aria-label="SuperAdmin navigation">
      {SUPERADMIN_NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        const labelKey = NAV_KEY_MAP[item.id] ?? "nav.overview";
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function SuperAdminSidebar() {
  const { t } = useSuperAdminT();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          S
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{t("shell.brand")}</p>
          <p className="truncate text-[11px] text-zinc-500">{t("shell.subtitle")}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks />
      </div>
      <div className="border-t border-zinc-800 p-3">
        <SuperAdminLanguageSwitch compact />
      </div>
    </aside>
  );
}

export function SuperAdminTopBar() {
  const pathname = usePathname();
  const { t } = useSuperAdminT();
  const current = SUPERADMIN_NAV_ITEMS.find((item) => item.match(pathname));
  const currentLabel = current ? t(NAV_KEY_MAP[current.id] ?? "nav.overview") : t("shell.brand");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-md lg:pl-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-800 bg-zinc-900 text-zinc-300 lg:hidden"
            aria-label={t("shell.openNav")}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-zinc-800 bg-zinc-950 p-0">
          <SheetHeader className="border-b border-zinc-800 px-4 py-4 text-left">
            <SheetTitle className="text-white">{t("shell.brand")}</SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavLinks />
          </div>
          <div className="border-t border-zinc-800 p-3">
            <SuperAdminLanguageSwitch compact />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{currentLabel}</p>
        <p className="truncate text-xs text-zinc-500">{t("shell.topSubtitle")}</p>
      </div>

      <div className="flex items-center gap-2">
        <SuperAdminLanguageSwitch />
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
            {t("shell.mockAuth")}
          </span>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            {t("shell.storeAdmin")}
          </Link>
        </div>
      </div>
    </header>
  );
}
