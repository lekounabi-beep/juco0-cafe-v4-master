/**
 * Viva Wallet Native Smart Checkout Integration
 * Demo Environment Implementation
 */

export interface VivaOrderRequest {
  amount: number;
  customerDetails: {
    email?: string;
    fullName?: string;
    phone?: string;
  };
}

export interface VivaOrderResponse {
  orderCode: string;
  errorCode?: number;
  errorText?: string;
}

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
  // Use the payment page URL from environment variable or fallback to demo
  const vivaWebBaseUrl = process.env.NEXT_PUBLIC_VIVA_WEB_BASE_URL || 'https://demo.vivapayments.com';
  const paymentUrl = `${vivaWebBaseUrl}/web/checkout?ref=${orderCode}`;
  console.log('Redirecting to Viva Wallet:', paymentUrl);
  window.location.href = paymentUrl;
}

/**
 * Verifies a Viva Wallet transaction
 * This should be called on the server-side for security
 */
export async function verifyVivaTransaction(transactionId: string): Promise<boolean> {
  const VIVA_API_KEY = process.env.VIVA_CLIENT_SECRET || '';
  const VIVA_MERCHANT_ID = process.env.VIVA_CLIENT_ID || '';
  const VIVA_API_BASE_URL = process.env.VIVA_API_BASE_URL || 'https://demo-api.vivapayments.com';

  if (!VIVA_API_KEY || !VIVA_MERCHANT_ID) {
    console.warn('Viva Wallet credentials not configured. Skipping verification.');
    return true; // For demo mode, always return true
  }

  try {
    const apiUrl = `${VIVA_API_BASE_URL}/api/transactions/${transactionId}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${VIVA_MERCHANT_ID}:${VIVA_API_KEY}`)}`,
      },
    });

    if (!response.ok) {
      console.error('Viva Wallet Verification Error:', response.status);
      return false;
    }

    const data = await response.json();
    return data.status === 'Completed' || data.Status === 'Completed';
  } catch (error) {
    console.error('Viva Wallet Verification Error:', error);
    return false;
  }
}
