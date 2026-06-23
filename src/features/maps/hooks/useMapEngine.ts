/**
 * useMapEngine - React Adapter for MapEngine
 * 
 * Provides React hooks to subscribe to MapEngine events.
 * React is ONLY a subscriber - no map logic here.
 */

import { useEffect, useRef, useCallback } from 'react';
import { mapEngine } from '../engine/MapEngine';
import type { MapEventTypes } from '../engine/MapEvents';
import type { EventHandler, Unsubscribe } from '../engine/types';

export function useMapEngine() {
  const engineRef = useRef(mapEngine);

  /**
   * Subscribe to MapEngine event
   * Returns unsubscribe function
   */
  const on = useCallback(<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe => {
    const unsubscribe = engineRef.current.on(event, handler);
    return unsubscribe;
  }, []);

  /**
   * Subscribe to MapEngine event once
   * Returns unsubscribe function
   */
  const once = useCallback(<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe => {
    const unsubscribe = engineRef.current.once(event, handler);
    return unsubscribe;
  }, []);

  return {
    engine: engineRef.current,
    on,
    once,
  };
}
