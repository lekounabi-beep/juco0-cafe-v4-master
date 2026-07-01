/**
 * Poll coordinator — pure decision logic for useTrackingSession.
 * Single-flight is enforced by the hook (loadInFlightRef).
 */

import { isTerminalOrder } from '@/features/tracking/core/terminal-order';
import type { TrackingSessionGpsMode } from '@/features/tracking/types/tracking-session.types';
import type { TerminalOrderFields } from '@/features/tracking/core/terminal-order';

export const TRACKING_POLL_INTERVAL_MS = 3_000;

export type PollSkipReason =
  | 'terminal'
  | 'hidden'
  | 'in_flight'
  | 'no_order_id';

export type PollTickDecision =
  | { action: 'skip'; reason: PollSkipReason }
  | { action: 'poll'; gpsMode: TrackingSessionGpsMode; forceBootstrap: boolean };

export type PollCoordinatorInput = {
  orderId: string;
  order: TerminalOrderFields;
  assignmentId: string | null;
  documentHidden: boolean;
  loadInFlight: boolean;
  gpsBootstrappedForAssignment: string | null;
  forceBootstrap: boolean;
};

export function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function evaluatePollTick(input: PollCoordinatorInput): PollTickDecision {
  if (!input.orderId) {
    return { action: 'skip', reason: 'no_order_id' };
  }

  if (input.loadInFlight) {
    return { action: 'skip', reason: 'in_flight' };
  }

  if (isTerminalOrder(input.order)) {
    return { action: 'skip', reason: 'terminal' };
  }

  if (input.documentHidden) {
    return { action: 'skip', reason: 'hidden' };
  }

  if (!input.assignmentId) {
    return { action: 'poll', gpsMode: 'none', forceBootstrap: false };
  }

  const needsBootstrap =
    input.forceBootstrap ||
    input.gpsBootstrappedForAssignment !== input.assignmentId;

  return {
    action: 'poll',
    gpsMode: needsBootstrap ? 'bootstrap' : 'latest',
    forceBootstrap: needsBootstrap,
  };
}

export function connectionStateFromContext(ctx: {
  isTerminal: boolean;
  documentHidden: boolean;
  hasError: boolean;
  isPolling: boolean;
}): 'idle' | 'polling' | 'paused' | 'stopped' | 'error' {
  if (ctx.hasError) return 'error';
  if (ctx.isTerminal) return 'stopped';
  if (ctx.documentHidden) return 'paused';
  if (ctx.isPolling) return 'polling';
  return 'idle';
}
