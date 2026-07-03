import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";

export interface BusinessHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

export interface StoreInfo {
  address: string;
  phone: string;
  instagram: string;
}

export interface StoreSettings {
  business_hours: BusinessHours;
  store_info: StoreInfo;
}

function parseBusinessHours(raw: Json | undefined): BusinessHours {
  const fallback = getDefaultBusinessHours();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;

  const record = raw as Record<string, unknown>;
  const readDay = (key: keyof BusinessHours) => {
    const day = record[key];
    if (day && typeof day === "object" && !Array.isArray(day)) {
      const slots = day as Record<string, unknown>;
      if (typeof slots.open === "string" && typeof slots.close === "string") {
        return { open: slots.open, close: slots.close };
      }
    }
    return fallback[key];
  };

  return {
    monday: readDay("monday"),
    tuesday: readDay("tuesday"),
    wednesday: readDay("wednesday"),
    thursday: readDay("thursday"),
    friday: readDay("friday"),
    saturday: readDay("saturday"),
    sunday: readDay("sunday"),
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data: hoursData } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "business_hours")
    .single();

  const { data: infoData } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "store_info")
    .single();

  return {
    business_hours: parseBusinessHours(hoursData?.value),
    store_info: normalizeStoreInfoFromDb(infoData?.value),
  };
}

function normalizeStoreInfoFromDb(raw: unknown): StoreInfo {
  const fallback = getDefaultStoreInfo();
  if (!raw || typeof raw !== "object") return fallback;

  const record = raw as Record<string, unknown>;
  return {
    address:
      typeof record.address === "string" && record.address.trim()
        ? record.address.trim()
        : fallback.address,
    phone:
      typeof record.phone === "string" && record.phone.trim()
        ? record.phone.trim()
        : fallback.phone,
    instagram:
      typeof record.instagram === "string" && record.instagram.trim()
        ? record.instagram.trim()
        : fallback.instagram,
  };
}

export async function updateBusinessHours(hours: BusinessHours): Promise<void> {
  const patch: TablesUpdate<"store_settings"> = {
    value: JSON.parse(JSON.stringify(hours)) as Json,
  };
  const { error } = await supabase.from("store_settings").update(patch).eq("key", "business_hours");

  if (error) throw error;
}

export async function updateStoreInfo(info: StoreInfo): Promise<void> {
  const patch: TablesUpdate<"store_settings"> = {
    value: JSON.parse(JSON.stringify(info)) as Json,
  };
  const { error } = await supabase.from("store_settings").update(patch).eq("key", "store_info");

  if (error) throw error;
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
