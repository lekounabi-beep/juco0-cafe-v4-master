/**

 * Production environment validation — fails startup when required secrets are missing.

 */

import { serverLog } from "./logger";

/** Required in every environment (dev + production). */

const RUNTIME_REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",

  "NEXT_PUBLIC_SUPABASE_ANON_KEY",

  "SUPABASE_SERVICE_ROLE_KEY",

  "ADMIN_USERNAME",

  "ADMIN_PASSWORD",
] as const;

/** Additional requirements when NODE_ENV=production. */

const PRODUCTION_ONLY_REQUIRED = [
  "SESSION_SECRET",

  "VIVA_CLIENT_ID",

  "VIVA_CLIENT_SECRET",

  "VIVA_SOURCE_CODE",

  "VIVA_WEBHOOK_KEY",
] as const;

const PRODUCTION_REQUIRED = [...RUNTIME_REQUIRED, ...PRODUCTION_ONLY_REQUIRED] as const;

let validated = false;

function isSet(key: string): boolean {
  const value = process.env[key];

  return typeof value === "string" && value.trim().length > 0;
}

function formatMissingMessage(missing: readonly string[]): string {
  const scope = isProduction()
    ? "Required when NODE_ENV=production"
    : "Required in all environments";
  return `${scope} — missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill in values.`;
}

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
      throw new Error(
        "VIVA_CLIENT_ID, VIVA_CLIENT_SECRET, and VIVA_SOURCE_CODE are required in production",
      );
    }

    return { clientId, clientSecret, sourceCode };
  }

  if (!clientId || !clientSecret) {
    throw new Error("VIVA credentials are not configured");
  }

  return { clientId, clientSecret, sourceCode: sourceCode || "" };
}

/**

 * Validates environment on server startup (instrumentation hook).

 * Fails fast with a clear message when required variables are missing.

 */

export function validateRuntimeEnv(): void {
  if (validated) return;

  const required = isProduction() ? PRODUCTION_REQUIRED : RUNTIME_REQUIRED;

  const missing = required.filter((key) => !isSet(key));

  if (missing.length > 0) {
    serverLog.error("env.validation.failed", {
      missing,

      environment: process.env.NODE_ENV ?? "unknown",
    });

    throw new Error(formatMissingMessage(missing));
  }

  validated = true;
}

/** @deprecated Use validateRuntimeEnv */

export function validateProductionEnv(): void {
  validateRuntimeEnv();
}

export type EnvVarMeta = {
  key: string;

  required: "always" | "production" | "optional";

  description: string;
};

/** Documented env manifest — used by .env.example and ops runbooks. */

export const ENV_MANIFEST: EnvVarMeta[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", required: "always", description: "Supabase project URL" },

  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: "always",
    description: "Supabase anon/public key",
  },

  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: "always",
    description: "Supabase service role key (server only)",
  },

  { key: "ADMIN_USERNAME", required: "always", description: "Kitchen admin login username" },

  { key: "ADMIN_PASSWORD", required: "always", description: "Kitchen admin login password" },

  {
    key: "SESSION_SECRET",
    required: "production",
    description: "HMAC secret for signed session cookies",
  },

  { key: "VIVA_CLIENT_ID", required: "production", description: "Viva Wallet OAuth client ID" },

  {
    key: "VIVA_CLIENT_SECRET",
    required: "production",
    description: "Viva Wallet OAuth client secret",
  },

  { key: "VIVA_SOURCE_CODE", required: "production", description: "Viva payment source code" },

  { key: "VIVA_WEBHOOK_KEY", required: "production", description: "Viva webhook verification key" },

  {
    key: "NEXT_PUBLIC_BASE_URL",
    required: "optional",
    description: "Public app base URL (e.g. zrok tunnel during staging)",
  },

  {
    key: "NEXT_PUBLIC_VIVA_WEB_BASE_URL",
    required: "optional",
    description: "Viva checkout web base URL",
  },

  {
    key: "VIVA_REDIRECT_URL",
    required: "optional",
    description: "Override card payment return URL",
  },

  {
    key: "VIVA_ACCOUNTS_BASE_URL",
    required: "optional",
    description: "Viva accounts API base (demo/production)",
  },

  {
    key: "VIVA_API_BASE_URL",
    required: "optional",
    description: "Viva payments API base (demo/production)",
  },

  {
    key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    required: "optional",
    description: "Google Maps JavaScript API key",
  },

  {
    key: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
    required: "optional",
    description: "Mapbox access token",
  },

  {
    key: "NEXT_PUBLIC_MAP_PROVIDER",
    required: "optional",
    description: "Map provider: google | mapbox",
  },

  {
    key: "NEXT_PUBLIC_SW_VERSION",
    required: "optional",
    description: "Service worker cache bust version",
  },

  {
    key: "NEXT_PUBLIC_SUPERADMIN_ENABLED",
    required: "optional",
    description: "Enable SuperAdmin console (requires admin login)",
  },

  {
    key: "NEXT_PUBLIC_TRACKING_SESSION",
    required: "optional",
    description: "Enable tracking session v2 path",
  },

  {
    key: "NEXT_PUBLIC_TRACKING_DEBUG",
    required: "optional",
    description: "Show tracking debug panel",
  },

  {
    key: "ADMIN_COOKIE_SECURE",
    required: "optional",
    description: "Force secure admin cookie (true/false)",
  },

  {
    key: "DRIVER_COOKIE_SECURE",
    required: "optional",
    description: "Force secure driver cookie (true/false)",
  },

  {
    key: "CARD_PAYMENT_ABANDONED_MINUTES",
    required: "optional",
    description: "Minutes before abandoning pending card orders",
  },

  { key: "ZROK_BIN", required: "optional", description: "Path to zrok binary for bun run tunnel" },
  {
    key: "VIVA_WEBHOOK_IP_ALLOWLIST",
    required: "optional",
    description: "Comma-separated exact Viva webhook source IPs (firewall/CDN preferred)",
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    required: "optional",
    description:
      "Upstash Redis REST URL — shared webhook rate limiting (recommended for multi-instance production)",
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    required: "optional",
    description: "Upstash Redis REST token — pair with UPSTASH_REDIS_REST_URL",
  },
  {
    key: "APP_VERSION",
    required: "optional",
    description: "Override app version reported by /api/health (defaults to 1.0.0)",
  },
  {
    key: "GIT_COMMIT",
    required: "optional",
    description:
      "Git commit SHA for /api/health (falls back to VERCEL_GIT_COMMIT_SHA or GITHUB_SHA)",
  },
  {
    key: "SENTRY_DSN",
    required: "optional",
    description: "Sentry DSN — enables error reporting via monitoring abstraction when set",
  },
  {
    key: "SENTRY_ENVIRONMENT",
    required: "optional",
    description: "Sentry environment label: development | staging | production",
  },
];
