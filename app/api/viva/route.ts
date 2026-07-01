import { NextRequest, NextResponse } from 'next/server';
import { verifyCheckoutToken } from '@/lib/server/checkout-token.server';
import { createVivaPaymentOrderServer } from '@/integrations/viva/services/payment.server';
import { isProduction } from '@/lib/server/env';
import { serverLog } from '@/lib/server/logger';

export async function POST(request: NextRequest) {
  try {
    if (isProduction()) {
      const { requireVivaCredentials } = await import('@/lib/server/env');
      requireVivaCredentials();
    }

    const body = await request.json();
    const { checkoutToken } = body as { checkoutToken?: string };

    if (!checkoutToken) {
      return NextResponse.json({ error: 'Checkout token required' }, { status: 400 });
    }

    const draft = verifyCheckoutToken(checkoutToken);
    if (!draft) {
      serverLog.warn('payment.failed', { reason: 'invalid_checkout_token_api' });
      return NextResponse.json({ error: 'Invalid or expired checkout token' }, { status: 403 });
    }

    if (draft.vivaOrderCode) {
      return NextResponse.json({ orderCode: draft.vivaOrderCode });
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host =
      request.headers.get('host') ||
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') ||
      'localhost:8080';
    const redirectUrl = process.env.VIVA_REDIRECT_URL || `${protocol}://${host}/order-success`;

    const vivaResult = await createVivaPaymentOrderServer(draft.total, redirectUrl);

    if ('error' in vivaResult) {
      return NextResponse.json({ error: vivaResult.error }, { status: 502 });
    }

    return NextResponse.json({ orderCode: vivaResult.orderCode });
  } catch (error) {
    serverLog.error('payment.failed', {
      step: 'api_route',
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { error: 'Payment service error' },
      { status: 500 },
    );
  }
}
