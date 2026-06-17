/**
 * Account Orders page
 */

import { OrdersSection } from '@/features/account/components/OrdersSection';
import { EspressoBackground } from '@/components/EspressoBackground';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/account" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Παραγγελίες</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <OrdersSection />
      </main>
    </div>
  );
}
