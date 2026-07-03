/**
 * Environment variable validation
 */

export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn("Missing env var:", key);
    return "";
  }
  return value || defaultValue!;
}

export const env = {
  // Google Maps (optional - used by map providers when enabled)
  GOOGLE_MAPS_API_KEY: getEnvVar("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", ""),

  // Live tracking map provider: "google" (default) | "mapbox"
  MAP_PROVIDER: getEnvVar("NEXT_PUBLIC_MAP_PROVIDER", "google"),
  MAPBOX_ACCESS_TOKEN: getEnvVar("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", ""),

  // Viva Wallet — public checkout URL only (secrets stay server-side)
  VIVA_WEB_BASE_URL: getEnvVar("NEXT_PUBLIC_VIVA_WEB_BASE_URL", "https://demo.vivapayments.com"),

  // Supabase (critical - will throw if missing)
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL", ""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),

  // App (optional - has default)
  NEXT_PUBLIC_BASE_URL: getEnvVar("NEXT_PUBLIC_BASE_URL", "https://nixk-server.shares.zrok.io"),
} as const;
