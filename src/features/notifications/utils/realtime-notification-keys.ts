/** Build dedup keys from Supabase realtime payloads. */
export function realtimeNotificationKeys(payload: {
  eventType?: string;
  commit_timestamp?: string;
  new?: { id?: string; created_at?: string; updated_at?: string };
  old?: { id?: string };
}): { eventId: string; orderId?: string } {
  const orderId = payload.new?.id ?? payload.old?.id;
  const eventId = String(
    payload.commit_timestamp ??
      payload.new?.updated_at ??
      payload.new?.created_at ??
      `${payload.eventType ?? 'event'}-${orderId ?? Date.now()}`
  );
  return { eventId, orderId };
}
