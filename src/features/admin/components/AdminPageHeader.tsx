import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 md:mb-8 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-white/60">{description}</div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
