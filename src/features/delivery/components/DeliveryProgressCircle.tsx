/**
 * Premium Circular Delivery Progress
 * Wolt/Uber Eats style animated circular progress indicator
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeliveryProgress } from '../hooks/useDeliveryProgress';

interface DeliveryProgressCircleProps {
  orderStatus: string | undefined;
  deliveryStatus: string | undefined;
  eta?: number | null;
}

export function DeliveryProgressCircle({
  orderStatus,
  deliveryStatus,
  eta,
}: DeliveryProgressCircleProps) {
  const progressState = useDeliveryProgress(orderStatus, deliveryStatus);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const circleRef = useRef<SVGCircleElement>(null);
  const circumference = 2 * Math.PI * 45; // radius = 45

  // Animate progress changes
  useEffect(() => {
    const duration = 800;
    const startProgress = displayProgress;
    const targetProgress = progressState.progress;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);
      const newProgress = startProgress + (targetProgress - startProgress) * easeProgress;

      setDisplayProgress(newProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    // Check for completion
    if (progressState.status === 'delivered' && !isComplete) {
      setIsComplete(true);
    }
  }, [progressState.progress, progressState.status, isComplete, displayProgress]);

  // Update circle stroke
  useEffect(() => {
    if (circleRef.current) {
      const offset = circumference - (displayProgress / 100) * circumference;
      circleRef.current.style.strokeDashoffset = offset.toString();
    }
  }, [displayProgress, circumference]);

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const formatETA = (etaSeconds: number | null | undefined): string => {
    if (etaSeconds === null || etaSeconds === undefined) return '...';
    const minutes = Math.ceil(etaSeconds / 60);
    return `${minutes}'`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Outer ring */}
        <svg width="200" height="200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="45"
            fill="none"
            stroke="#1f2937"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Progress circle */}
          <circle
            ref={circleRef}
            cx="100"
            cy="100"
            r="45"
            fill="none"
            stroke={progressState.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out',
              filter: `drop-shadow(0 0 8px ${progressState.color})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {progressState.status === 'delivered' ? (
            <div className="text-center">
              <div
                className="text-5xl font-bold"
                style={{ color: progressState.color }}
              >
                {progressState.icon}
              </div>
              <div className="text-sm text-gray-400 mt-1">Delivered</div>
            </div>
          ) : progressState.status === 'arrived' ? (
            <div className="text-center">
              <div className="text-4xl">📍</div>
              <div className="text-sm text-gray-400 mt-1">Arrived</div>
            </div>
          ) : eta !== null && eta !== undefined ? (
            <div className="text-center">
              <div className="text-5xl font-bold text-white">
                {formatETA(eta)}
              </div>
              <div className="text-sm text-gray-400 mt-1">ETA</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl text-gray-400">Calculating...</div>
            </div>
          )}
        </div>

        {/* Pulse animation at progress endpoint */}
        {progressState.status !== 'delivered' && (
          <div
            className="absolute w-4 h-4 rounded-full"
            style={{
              backgroundColor: progressState.color,
              boxShadow: `0 0 12px ${progressState.color}`,
              animation: 'pulse 2s infinite',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${(displayProgress / 100) * 360}deg) translateX(45px) rotate(-${(displayProgress / 100) * 360}deg)`,
            }}
          />
        )}
      </div>

      {/* Status message */}
      <div className="mt-6 text-center">
        <div className="text-3xl mb-2">{progressState.icon}</div>
        <div className="text-lg font-semibold text-white">{progressState.message}</div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
