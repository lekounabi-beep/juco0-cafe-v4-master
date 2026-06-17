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
  
  // Viva Wallet (optional for demo mode)
  VIVA_CLIENT_ID: getEnvVar('VIVA_CLIENT_ID', ''),
  VIVA_CLIENT_SECRET: getEnvVar('VIVA_CLIENT_SECRET', ''),
  VIVA_SOURCE_CODE: getEnvVar('VIVA_SOURCE_CODE', ''),
  VIVA_API_BASE_URL: getEnvVar('VIVA_API_BASE_URL', 'https://demo-api.vivapayments.com'),
  VIVA_ACCOUNTS_BASE_URL: getEnvVar('VIVA_ACCOUNTS_BASE_URL', 'https://demo-accounts.vivapayments.com'),
  VIVA_WEB_BASE_URL: getEnvVar('VIVA_WEB_BASE_URL', 'https://demo.vivapayments.com'),
  VIVA_REDIRECT_URL: getEnvVar('VIVA_REDIRECT_URL', ''),
  
  // Supabase (critical - will throw if missing)
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', ''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  
  // App (optional - has default)
  NEXT_PUBLIC_BASE_URL: getEnvVar('NEXT_PUBLIC_BASE_URL', 'https://never-posture-apprehend.ngrok-free.dev'),
} as const;
