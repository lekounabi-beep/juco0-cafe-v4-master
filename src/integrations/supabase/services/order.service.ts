/**
 * Order service for Supabase operations
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface CreateOrderInput {
  items: Array<{ name: string; price: number; qty: number; category?: string }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  payment_method: string;
  payment_status: string;
  notes?: string | null;
  status?: string;
  viva_transaction_id?: string | null;
}

export interface OrderResult {
  id: string;
  order_number: string;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<OrderResult> {
  // @ts-ignore - Supabase types don't include new tables yet
  const payload: TablesInsert<'orders'> = {
    items: input.items as any,
    subtotal: input.subtotal,
    delivery_fee: input.delivery_fee,
    total: input.total,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    address: input.address,
    address_notes: input.address_notes || null,
    lat: input.lat || null,
    lng: input.lng || null,
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    notes: input.notes || null,
    status: input.status || 'pending',
    viva_transaction_id: input.viva_transaction_id || null,
  };

  const { data, error } = await supabase
    .from('orders')
    // @ts-ignore - Supabase types don't include new tables yet
    .insert(payload)
    .select('id, order_number')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Database error: ${error.message || 'Failed to save order'}`);
  }

  return data as OrderResult;
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data;
}

export async function updateOrderStatus(
  id: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

export async function getUserOrders(profileId: string) {
  const { data, error } = await supabase
    .from('orders' as any)
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data;
}

export async function linkOrderToUser(orderId: string, profileId: string) {
  // @ts-expect-error - Supabase types don't include new tables yet
  const { error } = await supabase
    .from('orders' as any)
    .update({ user_id: profileId } as any)
    .eq('id', orderId);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to link order to user: ${error.message}`);
  }
}

export async function findGuestOrders(email: string, phone?: string) {
  let query = supabase
    .from('orders' as any)
    .select('*')
    .is('user_id', null);

  if (email) {
    query = query.ilike('customer_email', email);
  }

  if (phone) {
    query = query.ilike('customer_phone', phone);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to find guest orders: ${error.message}`);
  }

  return data;
}
