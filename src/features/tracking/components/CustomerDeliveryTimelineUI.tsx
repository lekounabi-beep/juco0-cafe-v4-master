/**
 * Customer-facing delivery timeline (Wolt / efood style).
 * Timeline, ETA, and status UI only — no map rendering.
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Coffee, MapPin, Package, PackageCheck, UserRound } from "lucide-react";
import { getCustomerOrderStep } from "@/shared/utils/customer-status";
import type { CustomerOrderStep } from "@/shared/utils/customer-status";

type TimelineStepId =
  "received" | "preparing" | "ready" | "driver_assigned" | "on_the_way" | "delivered";

const TIMELINE_STEPS = [
  { id: "received" as const, label: "Παραγγελία ελήφθη", emoji: "🟢" },
  { id: "preparing" as const, label: "Ετοιμάζεται", emoji: "☕" },
  { id: "ready" as const, label: "Έτοιμη", emoji: "✨" },
  { id: "driver_assigned" as const, label: "Οδηγός ανατέθηκε", emoji: "🛵" },
  { id: "on_the_way" as const, label: "Ο οδηγός έρχεται", emoji: "📍" },
  { id: "delivered" as const, label: "Παραδόθηκε", emoji: "✅" },
];

const STEP_ORDER: TimelineStepId[] = [
  "received",
  "preparing",
  "ready",
  "driver_assigned",
  "on_the_way",
  "delivered",
];

const POST_PICKUP = new Set(["picked_up", "in_transit", "arrived"]);

function stepIndex(step: TimelineStepId): number {
  return STEP_ORDER.indexOf(step);
}

function resolveTimelineStep(
  orderStatus?: string,
  deliveryStatus?: string,
  customerStep?: CustomerOrderStep,
): TimelineStepId | "cancelled" {
  const order = orderStatus || "pending";
  const delivery = deliveryStatus || "pending";

  if (customerStep === "cancelled" || order === "cancelled" || delivery === "cancelled") {
    return "cancelled";
  }
  if (customerStep === "delivered" || delivery === "delivered") {
    return "delivered";
  }
  if (delivery === "assigned") {
    return "driver_assigned";
  }
  if (POST_PICKUP.has(delivery) || customerStep === "on_the_way") {
    return "on_the_way";
  }
  if (order === "ready") {
    return "ready";
  }
  if (order === "accepted" || order === "preparing") {
    return "preparing";
  }
  return "received";
}

/* ── Radial layout (presentation only) ── */

const STEP_COUNT = TIMELINE_STEPS.length;
const START_ANGLE_DEG = -90;
const RING_CX = 50;
const RING_CY = 50;
const RING_RADIUS = 34;
const NODE_RING_RADIUS = 34;
const LABEL_RING_RADIUS = 44;

function stepAngleRad(index: number): number {
  return ((START_ANGLE_DEG + (360 / STEP_COUNT) * index) * Math.PI) / 180;
}

function polarToSvg(angleRad: number, radius: number) {
  return {
    x: RING_CX + radius * Math.cos(angleRad),
    y: RING_CY + radius * Math.sin(angleRad),
  };
}

function polarToPercent(angleRad: number, radius: number) {
  return {
    left: `${RING_CX + radius * Math.cos(angleRad)}%`,
    top: `${RING_CY + radius * Math.sin(angleRad)}%`,
  };
}

function describeRingSegment(fromIndex: number, toIndex: number, radius: number): string {
  const start = stepAngleRad(fromIndex);
  const end = stepAngleRad(toIndex);
  const p1 = polarToSvg(start, radius);
  const p2 = polarToSvg(end, radius);
  const largeArc = 0;
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

function progressFraction(activeIndex: number, isCancelled: boolean): number {
  if (isCancelled || activeIndex < 0) return 0;
  return Math.min(1, (activeIndex + 1) / STEP_COUNT);
}

function StepIcon({ stepId, className }: { stepId: TimelineStepId; className?: string }) {
  const props = { className, strokeWidth: 2, "aria-hidden": true as const };

  switch (stepId) {
    case "received":
      return <PackageCheck {...props} />;
    case "preparing":
      return <Coffee {...props} />;
    case "ready":
      return <Package {...props} />;
    case "driver_assigned":
      return <UserRound {...props} />;
    case "on_the_way":
      return <MapPin {...props} />;
    case "delivered":
      return <Check {...props} />;
  }
}

type StepVisualState = "completed" | "active" | "upcoming";

function getStepVisualState(
  index: number,
  activeIndex: number,
  isCancelled: boolean,
): StepVisualState {
  if (isCancelled || activeIndex < 0) return "upcoming";
  if (activeIndex > index) return "completed";
  if (activeIndex === index) return "active";
  return "upcoming";
}

function RadialStepNode({
  stepId,
  visualState,
}: {
  stepId: TimelineStepId;
  visualState: StepVisualState;
}) {
  if (visualState === "completed") {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.28)] sm:h-8 sm:w-8"
      >
        <Check className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" strokeWidth={2.5} />
      </motion.div>
    );
  }

  if (visualState === "active") {
    return (
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] ring-[3px] ring-primary/40 sm:h-10 sm:w-10"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" aria-hidden />
        <StepIcon stepId={stepId} className="relative h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </motion.div>
    );
  }

  return (
    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/20 bg-white/[0.03] text-white/30 sm:h-8 sm:w-8">
      <StepIcon stepId={stepId} className="h-3 w-3 opacity-60 sm:h-3.5 sm:w-3.5" />
    </div>
  );
}

function StepLabel({ label, visualState }: { label: string; visualState: StepVisualState }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={`${label}-${visualState}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`max-w-[4.75rem] text-center text-[9px] leading-tight sm:max-w-[5.75rem] sm:text-xs ${
          visualState === "active"
            ? "font-display font-bold text-white"
            : visualState === "completed"
              ? "font-medium text-white/65"
              : "font-normal text-white/30"
        }`}
      >
        {label}
      </motion.p>
    </AnimatePresence>
  );
}

function CircularDeliveryTimeline({
  activeIndex,
  isCancelled,
}: {
  activeIndex: number;
  isCancelled: boolean;
}) {
  const ringCircumference = 2 * Math.PI * RING_RADIUS;
  const fraction = progressFraction(activeIndex, isCancelled);
  const progressOffset = ringCircumference * (1 - fraction);

  return (
    <div
      className="relative mx-auto aspect-square w-full min-w-[240px] max-w-[min(100%,280px)] sm:max-w-[340px]"
      role="list"
      aria-label="Πρόοδος παραγγελίας"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <defs>
          <linearGradient id="delivery-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Base ring */}
        <circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.75"
        />

        {/* Completed segment arcs between consecutive steps */}
        {TIMELINE_STEPS.map((_, index) => {
          if (index === STEP_COUNT - 1) return null;
          const filled = !isCancelled && activeIndex > index;
          if (!filled) return null;
          return (
            <path
              key={`segment-${index}`}
              d={describeRingSegment(index, index + 1, RING_RADIUS)}
              fill="none"
              stroke="rgba(16,185,129,0.55)"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          );
        })}

        {/* Animated progress arc (current step advancement) */}
        {!isCancelled && activeIndex >= 0 && (
          <circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_RADIUS}
            fill="none"
            stroke="url(#delivery-progress-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}

        {/* Radial tick marks at each step on the ring */}
        {TIMELINE_STEPS.map((_, index) => {
          const angle = stepAngleRad(index);
          const inner = polarToSvg(angle, RING_RADIUS - 2.5);
          const outer = polarToSvg(angle, RING_RADIUS + 2.5);
          const filled = !isCancelled && activeIndex >= index;
          return (
            <line
              key={`tick-${index}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={filled ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.15)"}
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Step nodes + labels positioned on the circumference */}
      {TIMELINE_STEPS.map((step, index) => {
        const angle = stepAngleRad(index);
        const nodePos = polarToPercent(angle, NODE_RING_RADIUS);
        const labelPos = polarToPercent(angle, LABEL_RING_RADIUS);
        const visualState = getStepVisualState(index, activeIndex, isCancelled);

        return (
          <div key={step.id} role="listitem">
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: nodePos.left, top: nodePos.top }}
            >
              <RadialStepNode stepId={step.id} visualState={visualState} />
            </div>

            <div
              className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
              style={{ left: labelPos.left, top: labelPos.top }}
            >
              <StepLabel label={step.label} visualState={visualState} />
            </div>
          </div>
        );
      })}

      {/* Center hub — subtle step indicator (visual only) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-sm sm:h-16 sm:w-16">
        {!isCancelled && activeIndex >= 0 ? (
          <span className="font-display text-lg font-bold text-white sm:text-xl">
            {activeIndex + 1}
            <span className="text-xs font-normal text-white/40 sm:text-sm">/{STEP_COUNT}</span>
          </span>
        ) : (
          <span className="text-xs text-white/30">—</span>
        )}
      </div>
    </div>
  );
}

function OnTheWayDetails({
  driverName,
  eta,
  distance,
}: {
  driverName?: string | null;
  eta?: string | null;
  distance?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="overflow-hidden rounded-xl border border-primary/25 bg-primary/10 px-4 py-3"
    >
      <p className="text-sm text-white/70">Ο οδηγός είναι καθ&apos; οδόν προς εσάς</p>

      {(driverName || eta || distance) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {driverName && <span className="font-medium text-white">{driverName}</span>}
          {eta && <span className="font-semibold text-primary">{eta}</span>}
          {distance && <span className="text-white/50">{distance}</span>}
        </div>
      )}
    </motion.div>
  );
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
    () => customerStepProp ?? getCustomerOrderStep(orderStatus, deliveryStatus),
    [customerStepProp, orderStatus, deliveryStatus],
  );

  const currentStep = useMemo(
    () => resolveTimelineStep(orderStatus, deliveryStatus, customerStep),
    [orderStatus, deliveryStatus, customerStep],
  );

  const activeIndex = currentStep === "cancelled" ? -1 : stepIndex(currentStep);
  const isOnTheWay = currentStep === "on_the_way";
  const isCancelled = currentStep === "cancelled";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-6">
      {isCancelled && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-300">
          Η παραγγελία ακυρώθηκε
        </div>
      )}

      <CircularDeliveryTimeline activeIndex={activeIndex} isCancelled={isCancelled} />

      {isOnTheWay && !isCancelled && (
        <div className="mt-4 sm:mt-5">
          <OnTheWayDetails driverName={driverName} eta={eta} distance={distance} />
        </div>
      )}
    </div>
  );
}
