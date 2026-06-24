/**
 * Delivery context → driver GPS trail eligibility (map snapshot inputs).
 */

import { useEffect } from 'react';
import { setDriverTrailEligible } from '@/features/maps/core/driver-gps-feed';
import type { TrackingStage } from '@/features/maps/core/map-snapshot.types';

export function useDriverMapBridge({
  stage,
}: {
  destination: { lat: number; lng: number } | null;
  activeDeliveryId: string | null;
  stage: TrackingStage;
}) {
  useEffect(() => {
    const trailEligible =
      stage === 'picked_up' || stage === 'in_transit' || stage === 'arrived';
    setDriverTrailEligible(trailEligible);
  }, [stage]);
}
