/**
 * Driver PWA - Main Driver Application
 * Production-quality Progressive Web App for delivery drivers
 */

'use client';

import { useRouter } from 'next/navigation';
import { EspressoBackground } from '@/components/EspressoBackground';
import { useDriverPage } from '@/features/delivery/hooks/useDriverPage';
import { DriverHeader } from '@/features/delivery/components/DriverHeader';
import { DriverAvailabilityCard } from '@/features/delivery/components/DriverAvailabilityCard';
import { DriverActiveDeliveryCard } from '@/features/delivery/components/DriverActiveDeliveryCard';
import { DriverAvailableOrders } from '@/features/delivery/components/DriverAvailableOrders';
import { DriverStatsCard } from '@/features/delivery/components/DriverStatsCard';
import { DRIVER_AVAILABILITY } from '@/features/delivery/types/delivery.types';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function DriverPage() {
  const router = useRouter();
  const {
    loading,
    error,
    availabilityLoading,
    driverProfile,
    availabilityStatus,
    availableOrders,
    activeDelivery,
    assignmentLoading,
    isWakeLockActive,
    handleAvailabilityChange,
    handleAcceptOrder,
    handleDeliveryAction,
  } = useDriverPage();

  console.log('[DriverPage] Render called');
  console.log('[DriverPage] loading:', loading);
  console.log('[DriverPage] error:', error);
  console.log('[DriverPage] availabilityLoading:', availabilityLoading);
  console.log('[DriverPage] driverProfile:', driverProfile);
  console.log('[DriverPage] availabilityStatus:', availabilityStatus);
  console.log('[DriverPage] availableOrders:', availableOrders);
  console.log('[DriverPage] availableOrders.length:', availableOrders?.length);
  console.log('[DriverPage] activeDelivery:', activeDelivery);
  console.log('[DriverPage] assignmentLoading:', assignmentLoading);
  console.log('[DriverPage] isWakeLockActive:', isWakeLockActive);

  if (loading || availabilityLoading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <EspressoBackground />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/80">Φόρτωση...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen text-foreground">
        <EspressoBackground />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Σφάλμα</h1>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
            >
              Επιστροφή στην αρχική
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      
      <div className="relative z-10 min-h-screen pb-24">
        <DriverHeader 
          driverProfile={driverProfile} 
          availabilityStatus={availabilityStatus} 
        />

        <DriverAvailabilityCard
          availabilityStatus={availabilityStatus}
          onAvailabilityChange={handleAvailabilityChange}
        />

        {activeDelivery && (
          <DriverActiveDeliveryCard
            activeDelivery={activeDelivery}
            onDeliveryAction={handleDeliveryAction}
          />
        )}

        {!activeDelivery && availabilityStatus === DRIVER_AVAILABILITY.ONLINE && (
          <>
            {console.log('[DriverPage] Rendering DriverAvailableOrders - conditions met')}
            {console.log('[DriverPage] !activeDelivery:', !activeDelivery)}
            {console.log('[DriverPage] availabilityStatus === ONLINE:', availabilityStatus === DRIVER_AVAILABILITY.ONLINE)}
            <DriverAvailableOrders
              availableOrders={availableOrders}
              onAcceptOrder={handleAcceptOrder}
              assignmentLoading={assignmentLoading}
            />
          </>
        )}

        {activeDelivery === null && availabilityStatus !== DRIVER_AVAILABILITY.ONLINE && (
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center backdrop-blur-sm">
              <p className="text-white/60">Ο οδηγός είναι offline</p>
              <p className="text-sm text-white/40 mt-1">Ενεργοποιήστε τη διαθεσιμότητα για να δείτε παραγγελίες</p>
            </div>
          </div>
        )}

        <DriverStatsCard
          driverProfile={driverProfile}
          isWakeLockActive={isWakeLockActive}
        />
      </div>
    </div>
  );
}
