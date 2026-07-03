/**

 * Driver PWA - Main Driver Application

 */

"use client";

import { useMemo } from "react";

import { useSafeRouter } from "@/hooks/useSafeRouter";

import { EspressoBackground } from "@/components/EspressoBackground";

import { useDriverPage } from "@/features/delivery/hooks/useDriverPage";

import { DriverScreenHeader } from "@/features/delivery/components/DriverScreenHeader";

import { DriverOfflineBanner } from "@/features/delivery/components/DriverOfflineBanner";

import { LocationPermissionModal } from "@/features/delivery/components/LocationPermissionModal";

import { OfflineView } from "@/features/delivery/components/views/OfflineView";

import { OnlineWaitingView } from "@/features/delivery/components/views/OnlineWaitingView";

import { ActiveDeliveryView } from "@/features/delivery/components/views/ActiveDeliveryView";

import {
  deriveDriverUiState,
  DRIVER_UI_STATE,
} from "@/features/delivery/utils/derive-driver-ui-state";

import { AlertCircle, Loader2 } from "lucide-react";

export default function DriverPage() {
  const { push } = useSafeRouter();

  const {
    loading,

    error,

    availabilityLoading,

    driverProfile,

    availabilityStatus,

    availableOrders,

    activeDeliveryView,

    deliveryUi,

    driverDeliveryState,

    assignmentLoading,

    acceptingOrderId,

    handleAvailabilityChange,

    handleAcceptOrder,

    deliveryActionLoading,

    handleDeliveryAction,

    locationPermissionModalOpen,

    setLocationPermissionModalOpen,

    handleRetryLocationPermission,

    mapDestination,

    destinationResolving,

    driverPosition,

    routePoints,

    showDriverTrail,

    hasMapDestination,

    etaResult,
  } = useDriverPage();

  const uiState = useMemo(
    () => deriveDriverUiState(deliveryUi, availabilityStatus),

    [deliveryUi, availabilityStatus],
  );

  if (loading) {
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
              onClick={() => push("/driver/login")}
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

      <div className="relative z-10 flex min-h-screen flex-col">
        <DriverOfflineBanner />

        <DriverScreenHeader
          driverProfile={driverProfile}
          uiState={uiState}
          availabilityStatus={availabilityStatus}
          orderNumber={activeDeliveryView.order?.order_number}
        />

        {uiState === DRIVER_UI_STATE.OFFLINE && (
          <OfflineView
            availabilityLoading={availabilityLoading}
            onAvailabilityChange={handleAvailabilityChange}
          />
        )}

        {uiState === DRIVER_UI_STATE.ONLINE_WAITING && (
          <OnlineWaitingView
            availableOrders={availableOrders}
            availabilityLoading={availabilityLoading}
            assignmentLoading={assignmentLoading}
            acceptingOrderId={acceptingOrderId}
            onAvailabilityChange={handleAvailabilityChange}
            onAcceptOrder={handleAcceptOrder}
          />
        )}

        {uiState === DRIVER_UI_STATE.ACTIVE_DELIVERY && activeDeliveryView.assignment && (
          <ActiveDeliveryView
            activeDeliveryView={activeDeliveryView}
            deliveryUi={deliveryUi}
            mapDestination={mapDestination}
            destinationResolving={destinationResolving}
            driverLocation={driverPosition}
            routePoints={routePoints}
            showDriverTrail={showDriverTrail}
            hasDestination={hasMapDestination}
            onDeliveryAction={handleDeliveryAction}
            isPickingUp={driverDeliveryState.isPickingUp}
            deliveryActionLoading={deliveryActionLoading}
            eta={etaResult}
          />
        )}
      </div>

      <LocationPermissionModal
        open={locationPermissionModalOpen}
        onOpenChange={setLocationPermissionModalOpen}
        onRetry={() => void handleRetryLocationPermission()}
      />
    </div>
  );
}
