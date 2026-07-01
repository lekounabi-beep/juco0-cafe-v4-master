import { describe, expect, it } from 'vitest';
import {
  connectionStateFromContext,
  evaluatePollTick,
} from '@/features/tracking/core/poll-coordinator';

describe('evaluatePollTick', () => {
  const base = {
    orderId: '3769f0f5-5d21-4cbf-a4b7-eafaeeebe16d',
    order: { status: 'in_transit', delivery_status: 'in_transit' },
    assignmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    documentHidden: false,
    loadInFlight: false,
    gpsBootstrappedForAssignment: null,
    forceBootstrap: false,
  };

  it('skips when terminal', () => {
    const decision = evaluatePollTick({
      ...base,
      order: { status: 'delivered', delivery_status: 'delivered' },
    });
    expect(decision).toEqual({ action: 'skip', reason: 'terminal' });
  });

  it('skips when hidden', () => {
    const decision = evaluatePollTick({
      ...base,
      documentHidden: true,
    });
    expect(decision).toEqual({ action: 'skip', reason: 'hidden' });
  });

  it('skips when in flight', () => {
    const decision = evaluatePollTick({
      ...base,
      loadInFlight: true,
    });
    expect(decision).toEqual({ action: 'skip', reason: 'in_flight' });
  });

  it('polls with none gps when no assignment', () => {
    const decision = evaluatePollTick({
      ...base,
      assignmentId: null,
    });
    expect(decision).toEqual({ action: 'poll', gpsMode: 'none', forceBootstrap: false });
  });

  it('polls bootstrap when assignment not bootstrapped', () => {
    const decision = evaluatePollTick({ ...base });
    expect(decision).toEqual({
      action: 'poll',
      gpsMode: 'bootstrap',
      forceBootstrap: true,
    });
  });

  it('polls latest when bootstrapped', () => {
    const decision = evaluatePollTick({
      ...base,
      gpsBootstrappedForAssignment: base.assignmentId,
    });
    expect(decision).toEqual({
      action: 'poll',
      gpsMode: 'latest',
      forceBootstrap: false,
    });
  });
});

describe('connectionStateFromContext', () => {
  it('returns stopped when terminal', () => {
    expect(
      connectionStateFromContext({
        isTerminal: true,
        documentHidden: false,
        hasError: false,
        isPolling: false,
      }),
    ).toBe('stopped');
  });

  it('returns paused when hidden', () => {
    expect(
      connectionStateFromContext({
        isTerminal: false,
        documentHidden: true,
        hasError: false,
        isPolling: false,
      }),
    ).toBe('paused');
  });
});
