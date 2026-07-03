"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MapDynamicLoadingProps = {
  className?: string;
};

export function MapDynamicLoading({ className }: MapDynamicLoadingProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[240px] items-center justify-center bg-black/40 text-white/50",
        className,
      )}
      aria-hidden
    >
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
