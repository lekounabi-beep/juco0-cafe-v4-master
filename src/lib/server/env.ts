/**
 * Production environment validation — fails startup when required secrets are missing.
 */

import { serverLog } from "./logger";

const PRODUCTION_REQUIRED = [
  "SESSION_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "VIVA_CLIENT_ID",
  "VIVA_CLIENT_SECRET",
  "VIVA_SOURCE_CODE",
  "VIVA_WEBHOOK_KEY",
] as const;

let validated = false;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && isProduction()) {
    throw new Error("SESSION_SECRET is required in production");
  }
  return secret || "dev-only-insecure-session-secret-change-me";
}

export function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (isProduction()) {
    if (!username || !password) {
      throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required in production");
    }
    return { username, password };
  }

  if (!username || !password) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD must be set (no default credentials allowed)",
    );
  }

  return { username, password };
}

export function requireVivaCredentials(): {
  clientId: string;
  clientSecret: string;
  sourceCode: string;
} {
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;
  const sourceCode = process.env.VIVA_SOURCE_CODE;

  if (isProduction()) {
    if (!clientId || !clientSecret || !sourceCode) {
      throw new Error("VIVA_CLIENT_ID, VIVA_CLIENT_SECRET, and VIVA_SOURCE_CODE are required in production");
    }
    return { clientId, clientSecret, sourceCode };
  }

  if (!clientId || !clientSecret) {
    throw new Error("VIVA credentials are not configured");
  }

  return { clientId, clientSecret, sourceCode: sourceCode || "" };
}

export function validateProductionEnv(): void {
  if (validated) return;

  if (!isProduction()) {
    validated = true;
    return;
  }

  const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    serverLog.error("env.validation.failed", { missing });
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  validated = true;
}
