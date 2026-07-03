/**
 * Viva Wallet Native Smart Checkout Integration
 * Demo Environment Implementation
 */

import { captureException } from "@/lib/monitoring";
import type { VivaOrderRequest, VivaOrderResponse } from "../types";

/**
 * Creates a Viva Wallet order code for Native Smart Checkout
 * Calls the Next.js API route which then calls the Viva Wallet Sandbox API
 */
export async function createVivaOrderCode(
  amount: number,
  customerDetails: VivaOrderRequest["customerDetails"],
): Promise<VivaOrderResponse> {
  try {
    const response = await fetch("/api/viva", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, customerDetails }),
    });

    if (!response.ok) {
      captureException(new Error("viva_api_request_failed"), {
        status: response.status,
      });
      return {
        orderCode: "",
        errorCode: response.status,
        errorText: `Server Error (${response.status})`,
      };
    }

    const data = (await response.json()) as { orderCode?: string };
    return {
      orderCode: data.orderCode ?? "",
    };
  } catch (error) {
    captureException(error, { scope: "viva.create_order_code" });
    return {
      orderCode: "",
      errorCode: 500,
      errorText: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Redirects to Viva Wallet payment page
 */
export function redirectToVivaPayment(orderCode: string): void {
  const vivaWebBaseUrl =
    process.env.NEXT_PUBLIC_VIVA_WEB_BASE_URL || "https://demo.vivapayments.com";
  const paymentUrl = `${vivaWebBaseUrl}/web/checkout?ref=${orderCode}`;
  window.location.href = paymentUrl;
}
