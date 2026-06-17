/**
 * Application constants
 */

export const DELIVERY_FEE = 1.5;
export const FREE_DELIVERY_THRESHOLD = 15;

export const CHECKOUT_STEPS = {
  CART: 1,
  DELIVERY: 2,
  PAYMENT: 3,
} as const;

export const PAYMENT_METHODS = {
  CARD: 'card',
  COD: 'cod',
  PICKUP: 'pickup',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;
