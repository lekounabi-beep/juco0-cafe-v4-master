"use client";

import { useId } from "react";

type CheckoutMapPinProps = {
  lifted: boolean;
};

/**
 * Center-anchored delivery pin for the checkout address map.
 * Single wrapper · single pulse · single SVG · translateY-only lift.
 */
export function CheckoutMapPin({ lifted }: CheckoutMapPinProps) {
  const shadowId = useId().replace(/:/g, "");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-12 w-10 -translate-x-1/2 -translate-y-full"
    >
      <div
        className={`checkout-map-pin-pulse absolute bottom-0 left-1/2 size-9 rounded-full bg-[var(--color-primary)] motion-reduce:hidden ${
          lifted ? "is-paused" : ""
        }`}
      />
      <svg
        viewBox="0 0 40 48"
        className="checkout-map-pin-svg absolute bottom-0 left-1/2 h-12 w-10 motion-reduce:transition-none"
        style={{
          transform: `translateX(-50%) translateY(${lifted ? -8 : 0}px)`,
          transformOrigin: "center bottom",
        }}
        fill="none"
      >
        <defs>
          <filter
            id={shadowId}
            x="-30%"
            y="-20%"
            width="160%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.26" />
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`}>
          <path
            d="M20 46C20 46 6 30.5 6 19C6 11.2 12.2 4 20 4C27.8 4 34 11.2 34 19C34 30.5 20 46 20 46Z"
            fill="var(--color-primary)"
          />
          <circle cx="20" cy="19" r="7" fill="white" />
        </g>
      </svg>
      <style jsx>{`
        .checkout-map-pin-pulse {
          transform: translateX(-50%);
          transform-origin: center center;
          animation: checkout-map-pin-pulse 2s ease-out infinite;
        }
        .checkout-map-pin-pulse.is-paused {
          animation-play-state: paused;
        }
        .checkout-map-pin-svg {
          transition: transform 300ms ease-out;
        }
        @keyframes checkout-map-pin-pulse {
          0% {
            transform: translateX(-50%) scale(1);
            opacity: 0.35;
          }
          100% {
            transform: translateX(-50%) scale(2);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .checkout-map-pin-pulse {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
