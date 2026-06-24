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
  // Google Maps (optional - validated in DeliveryStep)
  GOOGLE_MAPS_API_KEY: getEnvVar('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
  
  // Viva Wallet — public checkout URL only (secrets stay server-side)
  VIVA_WEB_BASE_URL: getEnvVar('NEXT_PUBLIC_VIVA_WEB_BASE_URL', 'https://demo.vivapayments.com'),
  
  // Supabase (critical - will throw if missing)
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', ''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  
  // App (optional - has default)
  NEXT_PUBLIC_BASE_URL: getEnvVar('NEXT_PUBLIC_BASE_URL', 'https://glorify-nearness-petition.ngrok-free.dev'),
} as const;
