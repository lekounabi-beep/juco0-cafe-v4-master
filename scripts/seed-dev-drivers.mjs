#!/usr/bin/env node
/**
 * Development-only driver seed.
 * Usage: node scripts/seed-dev-drivers.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 * DO NOT run against production.
 */

import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const DEV_DRIVERS = [
  {
    full_name: "Driver A",
    username: "Driver A",
    password: "1",
    phone: "0000000001",
  },
  {
    full_name: "Driver B",
    username: "Driver B",
    password: "2",
    phone: "0000000002",
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed drivers in production.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  for (const driver of DEV_DRIVERS) {
    const password_hash = await bcrypt.hash(driver.password, 12);

    const { data: existing } = await supabase
      .from("drivers")
      .select("id")
      .eq("username", driver.username)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("drivers")
        .update({ password_hash, is_active: true })
        .eq("id", existing.id);

      if (error) {
        console.error(`Failed to update ${driver.username}:`, error.message);
      } else {
        console.log(`Updated ${driver.username}`);
      }
      continue;
    }

    const { error } = await supabase.from("drivers").insert({
      full_name: driver.full_name,
      username: driver.username,
      password_hash,
      phone: driver.phone,
      vehicle_type: "motorcycle",
      availability_status: "offline",
      is_active: true,
    });

    if (error) {
      console.error(`Failed to insert ${driver.username}:`, error.message);
    } else {
      console.log(`Inserted ${driver.username}`);
    }
  }

  console.log("Dev driver seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
