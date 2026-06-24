/**
 * Customer-facing delivery timeline (Wolt / efood style).
 * 4 human-readable steps only — no internal statuses exposed.
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { TrackingMap, type TrackingMapDebug } from '@/features/maps/components/TrackingMap';
import type { TrackingMapSnapshotInput } from '@/features/maps/core/map-snapshot.types';
import { getCustomerOrderStep } from '@/shared/utils/customer-status';
import type { CustomerOrderStep } from '@/shared/utils/customer-status';

const TIMELINE_STEPS = [
  { id: 'received' as const, label: 'Παραγγελία ελήφθη', emoji: '🟢' },
  { id: 'preparing' as const, label: 'Ετοιμάζεται', emoji: '☕' },
  { id: 'on_the_way' as const, label: 'Ο οδηγός έρχεται', emoji: '🛵' },
  { id: 'delivered' as const, label: 'Παραδόθηκε', emoji: '✅' },
];

const STEP_ORDER: CustomerOrderStep[] = ['received', 'preparing', 'on_the_way', 'delivered'];

function stepIndex(step: CustomerOrderStep): number {
  if (step === 'cancelled') return -1;
  return STEP_ORDER.indexOf(step);
}

export interface CustomerDeliveryTimelineProps {
  orderStatus?: string;
  deliveryStatus?: string;
  driverName?: string | null;
  eta?: string | null;
  distance?: string | null;
  snapshotInput: TrackingMapSnapshotInput;
  mapDebug?: TrackingMapDebug;
}

export function CustomerDeliveryTimeline({
  orderStatus,
  deliveryStatus,
  driverName,
  eta,
  distance,
  snapshotInput,
  mapDebug,
}: CustomerDeliveryTimelineProps) {
  const currentStep = useMemo(
    () => getCustomerOrderStep(orderStatus, deliveryStatus),
    [orderStatus, deliveryStatus]
  );

  const activeIndex = stepIndex(currentStep);
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

                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <div className="relative h-[220px] w-full sm:h-[260px]">
                        <TrackingMap snapshotInput={snapshotInput} debug={mapDebug} />
                      </div>
                    </div>
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
