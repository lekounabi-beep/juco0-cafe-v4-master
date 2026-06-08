/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_VIVA_DEMO_URL: string;
  readonly VITE_VIVA_MERCHANT_ID: string;
  readonly VITE_VIVA_API_KEY: string;
  readonly VITE_VIVA_SOURCE_CODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
