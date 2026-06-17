/**
 * Currency formatting utilities
 */

import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '@/config/constants';

export function formatEur(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

export function formatCentsToEur(cents: number): number {
  return cents / 100;
}

export function formatEurToCents(eur: number): number {
  return Math.round(eur * 100);
}

export function calcDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
