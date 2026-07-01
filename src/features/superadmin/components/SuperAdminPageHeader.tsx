import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SuperAdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:mb-8 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">{title}</h1>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
