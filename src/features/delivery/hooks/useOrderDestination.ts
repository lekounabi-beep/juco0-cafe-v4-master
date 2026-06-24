/**
 * Resolves valid map destination coordinates for an order (sync + geocode fallback).
 */

import { useEffect, useState } from 'react';
import { resolveOrderDestination, resolveOrderDestinationSync } from '../services/order-destination.service';
import { isValidLatLng } from '@/shared/utils/coordinates';
import type { Coordinates } from '@/shared/types/common.types';

type OrderForDestination = {
  id?: string;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  coords?: { lat?: number | string; lng?: number | string } | Coordinates | null;
} | null | undefined;

export function useOrderDestination(order: OrderForDestination) {
  const [destination, setDestination] = useState<Coordinates | null>(() => {
    const sync = resolveOrderDestinationSync(order ?? null);
    return isValidLatLng(sync) ? sync : null;
  });
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!order) {
      setDestination(null);
      setResolving(false);
      return;
    }

    const sync = resolveOrderDestinationSync(order);
    if (isValidLatLng(sync)) {
      setDestination(sync);
      setResolving(false);
      return;
    }

    if (!order.address?.trim()) {
      setDestination(null);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);

    void resolveOrderDestination(order).then((coords) => {
      if (cancelled) return;
      setDestination(isValidLatLng(coords) ? coords : null);
      setResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.lat, order?.lng, order?.address, order?.coords]);

  return { destination, resolving };
}
