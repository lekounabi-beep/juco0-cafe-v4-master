/**
 * Viva Wallet Native Smart Checkout Integration
 * Demo Environment Implementation
 */

import type { VivaOrderRequest, VivaOrderResponse } from '../types';

/**
 * Creates a Viva Wallet order code for Native Smart Checkout
 * Calls the Next.js API route which then calls the Viva Wallet Sandbox API
 */
export async function createVivaOrderCode(
  amount: number,
  customerDetails: VivaOrderRequest['customerDetails']
): Promise<VivaOrderResponse> {
  try {
    // Call our Next.js API route to avoid CORS issues
    const response = await fetch('/api/viva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, customerDetails }),
    });

    console.log('Server API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server API Error:', response.status, errorText);
      return {
        orderCode: '',
        errorCode: response.status,
        errorText: `Server Error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('Server API Response:', data);
    return {
      orderCode: data.orderCode,
    };
  } catch (error) {
    console.error('Viva Wallet Service Error:', error);
    return {
      orderCode: '',
      errorCode: 500,
      errorText: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Redirects to Viva Wallet payment page
 */
export function redirectToVivaPayment(orderCode: string): void {
  const vivaWebBaseUrl =
    process.env.NEXT_PUBLIC_VIVA_WEB_BASE_URL || 'https://demo.vivapayments.com';
  const paymentUrl = `${vivaWebBaseUrl}/web/checkout?ref=${orderCode}`;
  window.location.href = paymentUrl;
}
