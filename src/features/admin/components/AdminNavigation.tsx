"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Package2, ReceiptText, Settings, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, ADMIN_SECTION } from "@/features/admin/utils/admin-shell";

const icons = {
  [ADMIN_SECTION.ORDERS]: ReceiptText,
  [ADMIN_SECTION.PRODUCTS]: Package2,
  [ADMIN_SECTION.DRIVERS]: Truck,
  [ADMIN_SECTION.SETTINGS]: Settings,
};

export function AdminNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get("section");

  return (
    <>
      <nav className="hidden md:flex items-center gap-2" aria-label="Admin navigation">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = item.match(pathname, currentSection);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
        aria-label="Admin mobile navigation"
      >
        <div className="grid grid-cols-4 gap-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = item.match(pathname, currentSection);
            const Icon = icons[item.id];
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 text-[11px] font-medium transition",
                  active
                    ? "bg-primary/20 text-primary"
                    : "text-white/65 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="mb-1 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
