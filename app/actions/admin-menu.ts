"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BusinessHours,
  StoreInfo,
  StoreSettings,
} from "@/integrations/supabase/services/store-settings.service";
import { requireAdminSession } from "./admin-auth";
import { serverLog } from "@/lib/server/logger";
import { isUUID } from "@/shared/utils/uuid";

const PRODUCTS_TABLE = "products" as never;
const STORE_SETTINGS_TABLE = "store_settings" as never;

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type AdminMenuProduct = {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string | null;
  image: string | null;
  is_available: boolean;
  sort_order: number;
};

export type AdminMenuProductInput = {
  id?: string;
  category: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  is_available?: boolean;
  sort_order: number;
};

export type AdminMenuDataResult =
  | { success: true; products: AdminMenuProduct[]; storeSettings: StoreSettings }
  | { success: false; error: string };

export type SaveAdminMenuResult =
  | { success: true; updated: number; inserted: number }
  | { success: false; error: string };

function unauthorizedData(): AdminMenuDataResult {
  return { success: false, error: "Unauthorized — sign in again at /admin/login" };
}

function unauthorizedSave(): SaveAdminMenuResult {
  return { success: false, error: "Unauthorized — sign in again at /admin/login" };
}

function validateProductInput(
  product: AdminMenuProductInput,
  index: number,
): string | null {
  if (product.id && !isUUID(product.id)) {
    return `Invalid product id at index ${index}`;
  }

  const name = product.name?.trim();
  if (!name) {
    return `Product name is required at index ${index}`;
  }

  const category = product.category?.trim();
  if (!category) {
    return `Product category is required at index ${index}`;
  }

  if (!Number.isFinite(product.price) || product.price < 0) {
    return `Invalid price for «${name}»`;
  }

  if (!Number.isInteger(product.sort_order) || product.sort_order < 0) {
    return `Invalid sort order for «${name}»`;
  }

  return null;
}

function validateBusinessHours(hours: BusinessHours): string | null {
  for (const day of WEEKDAYS) {
    const slot = hours[day];
    if (!slot?.open || !slot?.close) {
      return `Missing hours for ${day}`;
    }
    if (!TIME_RE.test(slot.open) || !TIME_RE.test(slot.close)) {
      return `Invalid time format for ${day}`;
    }
    if (slot.open >= slot.close) {
      return `Open time must be before close time for ${day}`;
    }
  }
  return null;
}

function validateStoreInfo(info: StoreInfo): string | null {
  if (!info.address?.trim()) return "Store address is required";
  if (!info.phone?.trim()) return "Store phone is required";
  if (!info.instagram?.trim()) return "Store Instagram is required";
  return null;
}

function getDefaultBusinessHours(): BusinessHours {
  return {
    monday: { open: "07:00", close: "21:00" },
    tuesday: { open: "07:00", close: "21:00" },
    wednesday: { open: "07:00", close: "21:00" },
    thursday: { open: "07:00", close: "21:00" },
    friday: { open: "07:00", close: "21:00" },
    saturday: { open: "07:00", close: "21:00" },
    sunday: { open: "07:00", close: "21:00" },
  };
}

function getDefaultStoreInfo(): StoreInfo {
  return {
    address: "Nafpaktos, Greece",
    phone: "+30 26340 00000",
    instagram: "@juco.nafpaktos",
  };
}

function normalizeStoreInfo(raw: unknown): StoreInfo {
  const fallback = getDefaultStoreInfo();
  if (!raw || typeof raw !== "object") return fallback;

  const record = raw as Record<string, unknown>;
  return {
    address: typeof record.address === "string" && record.address.trim() ? record.address.trim() : fallback.address,
    phone: typeof record.phone === "string" && record.phone.trim() ? record.phone.trim() : fallback.phone,
    instagram:
      typeof record.instagram === "string" && record.instagram.trim()
        ? record.instagram.trim()
        : fallback.instagram,
  };
}

/** Server-authoritative admin menu catalog — bypasses RLS via service role. */
export async function getAdminMenuData(): Promise<AdminMenuDataResult> {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedData();
  }

  const { data: products, error: productsError } = await supabaseAdmin
    .from(PRODUCTS_TABLE)
    .select("id, category, name, price, description, image, is_available, sort_order")
    .order("sort_order", { ascending: true });

  if (productsError) {
    serverLog.error("admin.menu.load_failed", { error: productsError.message });
    return { success: false, error: "Failed to load products" };
  }

  const { data: hoursRow, error: hoursError } = await supabaseAdmin
    .from(STORE_SETTINGS_TABLE)
    .select("value")
    .eq("key", "business_hours")
    .maybeSingle();

  if (hoursError) {
    serverLog.error("admin.menu.hours_load_failed", { error: hoursError.message });
    return { success: false, error: "Failed to load business hours" };
  }

  const { data: infoRow, error: infoError } = await supabaseAdmin
    .from(STORE_SETTINGS_TABLE)
    .select("value")
    .eq("key", "store_info")
    .maybeSingle();

  if (infoError) {
    serverLog.error("admin.menu.info_load_failed", { error: infoError.message });
    return { success: false, error: "Failed to load store info" };
  }

  const hoursValue = hoursRow as { value: BusinessHours } | null;
  const infoValue = infoRow as { value: StoreInfo } | null;

  return {
    success: true,
    products: (products ?? []) as AdminMenuProduct[],
    storeSettings: {
      business_hours: hoursValue?.value ?? getDefaultBusinessHours(),
      store_info: normalizeStoreInfo(infoValue?.value),
    },
  };
}

/** Persist menu + store settings — admin session required, service role writes. */
export async function saveAdminMenuChanges(input: {
  products: AdminMenuProductInput[];
  business_hours: BusinessHours;
  store_info: StoreInfo;
}): Promise<SaveAdminMenuResult> {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedSave();
  }

  if (!input.products?.length) {
    return { success: false, error: "No products to save" };
  }

  const hoursError = validateBusinessHours(input.business_hours);
  if (hoursError) {
    return { success: false, error: hoursError };
  }

  const storeInfo = normalizeStoreInfo(input.store_info);

  const infoError = validateStoreInfo(storeInfo);
  if (infoError) {
    return { success: false, error: infoError };
  }

  for (let i = 0; i < input.products.length; i++) {
    const validationError = validateProductInput(input.products[i], i);
    if (validationError) {
      return { success: false, error: validationError };
    }
  }

  let updated = 0;
  let inserted = 0;

  for (const product of input.products) {
    const payload = {
      category: product.category.trim(),
      name: product.name.trim(),
      price: product.price,
      description: product.description?.trim() || null,
      image: product.image?.trim() || null,
      is_available: product.is_available ?? true,
      sort_order: product.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (product.id) {
      const { error } = await supabaseAdmin
        .from(PRODUCTS_TABLE)
        .update(payload as never)
        .eq("id", product.id);

      if (error) {
        serverLog.error("admin.menu.product_update_failed", {
          productId: product.id,
          error: error.message,
        });
        return { success: false, error: `Failed to update «${product.name}»` };
      }
      updated++;
      continue;
    }

    const { error } = await supabaseAdmin.from(PRODUCTS_TABLE).insert({
      ...payload,
      created_at: new Date().toISOString(),
    } as never);

    if (error) {
      serverLog.error("admin.menu.product_insert_failed", {
        name: product.name,
        error: error.message,
      });
      return { success: false, error: `Failed to create «${product.name}»` };
    }
    inserted++;
  }

  const { error: hoursUpdateError } = await supabaseAdmin
    .from(STORE_SETTINGS_TABLE)
    .update({ value: input.business_hours, updated_at: new Date().toISOString() } as never)
    .eq("key", "business_hours");

  if (hoursUpdateError) {
    serverLog.error("admin.menu.hours_save_failed", { error: hoursUpdateError.message });
    return { success: false, error: "Failed to save business hours" };
  }

  const { error: infoUpdateError } = await supabaseAdmin
    .from(STORE_SETTINGS_TABLE)
    .update({ value: storeInfo, updated_at: new Date().toISOString() } as never)
    .eq("key", "store_info");

  if (infoUpdateError) {
    serverLog.error("admin.menu.info_save_failed", { error: infoUpdateError.message });
    return { success: false, error: "Failed to save store info" };
  }

  revalidatePath("/");
  serverLog.info("admin.menu.saved", { updated, inserted });

  return { success: true, updated, inserted };
}
