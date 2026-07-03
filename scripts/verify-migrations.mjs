#!/usr/bin/env node
/**
 * Post-migration smoke checks for Phase 1 security migrations.
 *
 * Usage:
 *   node scripts/verify-migrations.mjs
 *   bun run verify:migrations
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * and SUPABASE_SERVICE_ROLE_KEY in .env.local (or environment).
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envLocal = resolve(root, ".env.local");

if (existsSync(envLocal)) {
  config({ path: envLocal });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "[verify-migrations] Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function isPermissionDenied(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  const code = String(error?.code ?? "");
  return (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  );
}

async function expectAnonDenied(table, action) {
  const query =
    action === "select"
      ? anon.from(table).select("id").limit(1)
      : anon.from(table).insert({}).select("id");

  const { error } = await query;
  if (error && isPermissionDenied(error)) {
    pass(`anon ${action} denied on ${table}`, error.message);
    return;
  }

  if (!error && action === "select") {
    fail(`anon ${action} denied on ${table}`, "query succeeded — anon may still have access");
    return;
  }

  if (error) {
    pass(`anon ${action} denied on ${table}`, error.message);
    return;
  }

  fail(`anon ${action} denied on ${table}`, "insert succeeded — critical security gap");
}

async function tableExists(table) {
  const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
  if (error) {
    fail(`table ${table} exists`, error.message);
    return false;
  }
  pass(`table ${table} exists`);
  return true;
}

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (error) {
    fail(`column ${table}.${column} exists`, error.message);
    return false;
  }
  pass(`column ${table}.${column} exists`);
  return true;
}

async function main() {
  console.log("[verify-migrations] Running Phase 1 security smoke checks...\n");

  console.log("Schema:");
  await tableExists("revoked_sessions");
  await tableExists("checkout_pending");
  await tableExists("auth_lockouts");
  await columnExists("orders", "client_request_id");
  await columnExists("drivers", "password_hash");

  const { error: passwordColumnError } = await admin.from("drivers").select("password").limit(1);
  if (passwordColumnError?.message?.includes("password")) {
    pass("drivers.password column removed");
  } else if (!passwordColumnError) {
    fail("drivers.password column removed", "plaintext password column still readable");
  } else {
    pass("drivers.password column removed", passwordColumnError.message);
  }

  console.log("\nAnon access (must be denied):");
  await expectAnonDenied("orders", "select");
  await expectAnonDenied("orders", "insert");
  await expectAnonDenied("delivery_assignments", "select");

  console.log("\nService role access (must work):");
  const { error: ordersReadError } = await admin.from("orders").select("id").limit(1);
  if (ordersReadError) {
    fail("service_role can read orders", ordersReadError.message);
  } else {
    pass("service_role can read orders");
  }

  const { error: assignmentsReadError } = await admin
    .from("delivery_assignments")
    .select("id")
    .limit(1);
  if (assignmentsReadError) {
    fail("service_role can read delivery_assignments", assignmentsReadError.message);
  } else {
    pass("service_role can read delivery_assignments");
  }

  console.log("\nTracking RPC grants (anon must be denied):");
  const fakeOrderId = "00000000-0000-4000-8000-000000000001";
  const { error: rpcError } = await anon.rpc("get_order_for_tracking", {
    order_uuid: fakeOrderId,
  });
  if (rpcError && isPermissionDenied(rpcError)) {
    pass("anon cannot execute get_order_for_tracking", rpcError.message);
  } else if (!rpcError) {
    fail("anon cannot execute get_order_for_tracking", "RPC executed for anon");
  } else {
    pass("anon cannot execute get_order_for_tracking", rpcError.message);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n[verify-migrations] ${checks.length - failed.length}/${checks.length} checks passed`,
  );

  if (failed.length > 0) {
    console.error("\nFailed checks:");
    for (const item of failed) {
      console.error(`  - ${item.name}: ${item.detail}`);
    }
    console.error(
      "\nApply pending migrations with Supabase CLI (supabase db push) or run SQL from supabase/migrations/.",
    );
    process.exit(1);
  }

  console.log("[verify-migrations] All security smoke checks passed.");
}

main().catch((error) => {
  console.error("[verify-migrations] Unexpected error:", error);
  process.exit(1);
});
