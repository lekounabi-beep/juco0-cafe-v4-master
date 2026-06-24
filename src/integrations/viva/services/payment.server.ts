/**
 * Server-only Viva Wallet verification.
 * Never import this file from client components.
 */

export async function verifyVivaTransactionServer(transactionId: string): Promise<boolean> {
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;
  const apiBaseUrl = process.env.VIVA_API_BASE_URL || 'https://demo-api.vivapayments.com';

  if (!clientId || !clientSecret) {
    console.error('[Viva] Credentials missing — payment verification failed');
    return false;
  }

  if (!transactionId) return false;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${apiBaseUrl}/api/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[Viva] Verification HTTP error:', response.status);
      return false;
    }

    const data = await response.json();
    return data.status === 'Completed' || data.Status === 'Completed';
  } catch (error) {
    console.error('[Viva] Verification error:', error);
    return false;
  }
}
