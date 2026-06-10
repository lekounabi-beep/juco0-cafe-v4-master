/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ['192.168.31.224', '*.trycloudflare.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imageproxy.wolt.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [60, 70, 75, 80, 85, 90, 95],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_VIVA_WEB_BASE_URL: process.env.NEXT_PUBLIC_VIVA_WEB_BASE_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    VIVA_CLIENT_ID: process.env.VIVA_CLIENT_ID,
    VIVA_CLIENT_SECRET: process.env.VIVA_CLIENT_SECRET,
    VIVA_SOURCE_CODE: process.env.VIVA_SOURCE_CODE,
    VIVA_API_BASE_URL: process.env.VIVA_API_BASE_URL,
    VIVA_ACCOUNTS_BASE_URL: process.env.VIVA_ACCOUNTS_BASE_URL,
    VIVA_WEB_BASE_URL: process.env.VIVA_WEB_BASE_URL,
    VIVA_REDIRECT_URL: process.env.VIVA_REDIRECT_URL,
  },
};

module.exports = nextConfig;
