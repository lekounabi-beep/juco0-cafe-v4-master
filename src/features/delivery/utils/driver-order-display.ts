import { orderCoordinates } from "@/shared/utils/order-fields";
import type { DriverOrderDetails } from "../types/driver-order.types";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Σε αναμονή",
  accepted: "Αποδεκτή",
  preparing: "Σε προετοιμασία",
  ready: "Έτοιμη",
  assigned: "Ανατέθηκε",
  picked_up: "Παραλήφθηκε",
  in_transit: "Σε διανομή",
  arrived: "Έφτασε",
  delivered: "Παραδόθηκε",
  cancelled: "Ακυρώθηκε",
};

const DELIVERY_STAGE_LABELS: Record<string, string> = {
  assigned: "Αναμονή παραλαβής",
  picked_up: "Παραλήφθηκε από κατάστημα",
  in_transit: "Σε διανομή προς πελάτη",
  arrived: "Έφτασε στον προορισμό",
};

export function formatDriverPaymentMethod(method: string | undefined | null): string {
  if (!method) return "—";
  if (method === "cod") return "Μετρητά (COD)";
  if (method === "card") return "Κάρτα";
  return method;
}

export function formatDriverOrderStatus(status: string | undefined | null): string {
  if (!status) return "—";
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function formatDriverDeliveryStage(stage: string | undefined | null): string {
  if (!stage) return "—";
  return DELIVERY_STAGE_LABELS[stage] ?? formatDriverOrderStatus(stage);
}

export function formatDriverDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildMapboxDirectionsUrl(
  order: Pick<DriverOrderDetails, "lat" | "lng" | "address"> & {
    coords?: { lat?: number; lng?: number } | null;
  },
): string | null {
  const coords = orderCoordinates(order);
  if (!coords) return null;
  const destination = `${coords.lng},${coords.lat}`;
  return `https://www.mapbox.com/directions/?destination=${encodeURIComponent(destination)}`;
}

export function buildTelHref(phone: string | undefined | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\s+/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:${digits}`;
}
