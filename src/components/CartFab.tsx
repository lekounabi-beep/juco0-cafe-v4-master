import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart, formatEur } from "@/lib/cart-store";

export function CartFab() {
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const subtotal = useCart((s) => s.items.reduce((sum, i) => sum + i.qty * i.price, 0));

  if (count === 0) return null;

  return (
    <Link
      href="/checkout"
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 hover:-translate-x-1/2 animate-fade-up"
    >
      <span className="relative">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -top-2 -right-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-black px-1 text-[10px] font-bold text-primary">
          {count}
        </span>
      </span>
      <span>Καλάθι</span>
      <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{formatEur(subtotal)}</span>
    </Link>
  );
}
