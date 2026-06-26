/**
 * Customer-facing delivery timeline (Wolt / efood style).
 * Timeline, ETA, and status UI only — no map rendering.
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { getCustomerOrderStep } from '@/shared/utils/customer-status';
import type { CustomerOrderStep } from '@/shared/utils/customer-status';

type TimelineStepId =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'driver_assigned'
  | 'on_the_way'
  | 'delivered';

const TIMELINE_STEPS = [
  { id: 'received' as const, label: 'Παραγγελία ελήφθη', emoji: '🟢' },
  { id: 'preparing' as const, label: 'Ετοιμάζεται', emoji: '☕' },
  { id: 'ready' as const, label: 'Έτοιμη', emoji: '✨' },
  { id: 'driver_assigned' as const, label: 'Οδηγός ανατέθηκε', emoji: '🛵' },
  { id: 'on_the_way' as const, label: 'Ο οδηγός έρχεται', emoji: '📍' },
  { id: 'delivered' as const, label: 'Παραδόθηκε', emoji: '✅' },
];

const STEP_ORDER: TimelineStepId[] = [
  'received',
  'preparing',
  'ready',
  'driver_assigned',
  'on_the_way',
  'delivered',
];

const POST_PICKUP = new Set(['picked_up', 'in_transit', 'arrived']);

function stepIndex(step: TimelineStepId): number {
  return STEP_ORDER.indexOf(step);
}

function resolveTimelineStep(
  orderStatus?: string,
  deliveryStatus?: string,
  customerStep?: CustomerOrderStep,
): TimelineStepId | 'cancelled' {
  const order = orderStatus || 'pending';
  const delivery = deliveryStatus || 'pending';

  if (customerStep === 'cancelled' || order === 'cancelled' || delivery === 'cancelled') {
    return 'cancelled';
  }
  if (customerStep === 'delivered' || delivery === 'delivered') {
    return 'delivered';
  }
  if (delivery === 'assigned') {
    return 'driver_assigned';
  }
  if (POST_PICKUP.has(delivery) || customerStep === 'on_the_way') {
    return 'on_the_way';
  }
  if (order === 'ready') {
    return 'ready';
  }
  if (order === 'accepted' || order === 'preparing') {
    return 'preparing';
  }
  return 'received';
}

export interface CustomerDeliveryTimelineUIProps {
  /** Canonical step from useDeliveryState — preferred over re-derivation. */
  customerStep?: CustomerOrderStep;
  orderStatus?: string;
  deliveryStatus?: string;
  driverName?: string | null;
  eta?: string | null;
  distance?: string | null;
}

export function CustomerDeliveryTimelineUI({
  customerStep: customerStepProp,
  orderStatus,
  deliveryStatus,
  driverName,
  eta,
  distance,
}: CustomerDeliveryTimelineUIProps) {
  const customerStep = useMemo(
    () =>
      customerStepProp ??
      getCustomerOrderStep(orderStatus, deliveryStatus),
    [customerStepProp, orderStatus, deliveryStatus],
  );

  const currentStep = useMemo(
    () => resolveTimelineStep(orderStatus, deliveryStatus, customerStep),
    [orderStatus, deliveryStatus, customerStep],
  );

  const activeIndex = currentStep === 'cancelled' ? -1 : stepIndex(currentStep);
  const isOnTheWay = currentStep === 'on_the_way';
  const isCancelled = currentStep === 'cancelled';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-6">
      {isCancelled && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-300">
          Η παραγγελία ακυρώθηκε
        </div>
      )}

      <ol className="relative space-y-0">
        {TIMELINE_STEPS.map((step, index) => {
          const isPast = !isCancelled && activeIndex > index;
          const isCurrent = !isCancelled && activeIndex === index;
          const isLast = index === TIMELINE_STEPS.length - 1;

          return (
            <li key={step.id} className="relative flex gap-4">
              {!isLast && (
                <div
                  className={`absolute left-[19px] top-10 h-[calc(100%-12px)] w-0.5 ${
                    isPast ? 'bg-emerald-500/60' : 'bg-white/10'
                  }`}
                  aria-hidden
                />
              )}

              <div className="relative z-10 shrink-0 pt-0.5">
                {isPast ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50"
                  >
                    <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/25 text-lg ring-2 ring-primary shadow-[var(--shadow-glow)]"
                  >
                    {step.emoji}
                  </motion.div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg opacity-40 grayscale">
                    {step.emoji}
                  </div>
                )}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-8'}`}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${step.id}-${isCurrent}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className={`font-display text-base font-semibold leading-snug sm:text-lg ${
                      isCurrent
                        ? 'text-white'
                        : isPast
                          ? 'text-white/70'
                          : 'text-white/35'
                    }`}
                  >
                    {step.label}
                  </motion.p>
                </AnimatePresence>

                {isCurrent && isOnTheWay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="mt-4 overflow-hidden"
                  >
                    <p className="mb-3 text-sm text-white/60">
                      Ο οδηγός είναι καθ&apos; οδόν προς εσάς
                    </p>

                    {(driverName || eta) && (
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {driverName && (
                          <span className="font-medium text-white">{driverName}</span>
                        )}
                        {eta && (
                          <span className="text-primary font-semibold">{eta}</span>
                        )}
                        {distance && (
                          <span className="text-white/50">{distance}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
