"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function OperationsCard({
  title,
  href,
  loading,
  children,
  className,
}: {
  title: string;
  href?: string;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useSuperAdminT();

  return (
    <Card className={cn("border-zinc-800 bg-zinc-900/50 shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base text-white">{title}</CardTitle>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            {t("common.open")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-24 bg-zinc-800" />
            <Skeleton className="h-6 w-32 bg-zinc-800" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function OperationsStatRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
}) {
  const toneClass = {
    default: "text-white",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
    muted: "text-zinc-400",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("font-medium tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

export function QuickNavGrid({
  items,
}: {
  items: { label: string; href: string; icon: LucideIcon; description: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70"
        >
          <div className="flex items-start gap-3">
            <item.icon className="mt-0.5 h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
