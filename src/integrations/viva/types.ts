/**
 * Viva Wallet type definitions
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

export interface VivaTransaction {
  transactionId: string;
  status: string;
  amount: number;
}
