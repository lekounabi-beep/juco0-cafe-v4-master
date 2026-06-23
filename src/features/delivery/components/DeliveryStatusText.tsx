/**
 * Animated Delivery Status Text
 * Premium Wolt/Uber Eats style status text with smooth transitions
 */

'use client';

import { useEffect, useState } from 'react';
import { useDeliveryProgress } from '../hooks/useDeliveryProgress';

interface DeliveryStatusTextProps {
  orderStatus: string | undefined;
  deliveryStatus: string | undefined;
}

export function DeliveryStatusText({
  orderStatus,
  deliveryStatus,
}: DeliveryStatusTextProps) {
  const progressState = useDeliveryProgress(orderStatus, deliveryStatus);
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(progressState.message);
  const [currentIcon, setCurrentIcon] = useState(progressState.icon);

  // Animate status changes
  useEffect(() => {
    if (currentMessage !== progressState.message) {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentMessage(progressState.message);
        setCurrentIcon(progressState.icon);
        setIsVisible(true);
      }, 300);
    }
  }, [progressState.message, progressState.icon, currentMessage]);

  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="text-4xl mb-2">{currentIcon}</div>
      <div className="text-xl font-semibold text-white">{currentMessage}</div>
    </div>
  );
}
