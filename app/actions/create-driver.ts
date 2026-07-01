"use server";

import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "./admin-auth";
import { serverLog } from "@/lib/server/logger";
import type { CreateDriverResult } from "@/features/admin/types/admin-driver.types";

const BCRYPT_ROUNDS = 12;
const DRIVERS_TABLE = "drivers" as never;

async function generateUniqueUsername(fullName: string): Promise<string> {
  const base = fullName.trim().replace(/\s+/g, " ");
  if (!base) {
    throw new Error("Driver name is required");
  }

  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data } = await supabaseAdmin
      .from(DRIVERS_TABLE)
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${base} ${suffix}`;
    suffix += 1;
  }
}

export async function createDriver(formData: {
  full_name: string;
  password: string;
}): Promise<CreateDriverResult> {
  try {
    await requireAdminSession();
  } catch {
    return { error: "Unauthorized" };
  }

  const fullName = formData.full_name?.trim() ?? "";
  const password = formData.password ?? "";

  if (!fullName) {
    return { error: "Το όνομα είναι υποχρεωτικό." };
  }

  if (password.length < 1) {
    return { error: "Ο κωδικός είναι υποχρεωτικός." };
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { error: "Service role key not configured. Please check environment variables." };
    }

    const username = await generateUniqueUsername(fullName);
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { error: driverError } = await supabaseAdmin.from(DRIVERS_TABLE).insert({
      full_name: fullName,
      username,
      password_hash,
      phone: `internal-${username.replace(/\s+/g, "-").toLowerCase()}`,
      availability_status: "offline",
      total_deliveries: 0,
      is_active: true,
    } as never);

    if (driverError) {
      throw driverError;
    }

    revalidatePath("/admin");

    return { success: true, username };
  } catch (error: unknown) {
    serverLog.error("driver.create.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Failed to create driver. Please try again." };
  }
}
