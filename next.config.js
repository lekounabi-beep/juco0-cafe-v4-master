/** @type {import('next').NextConfig} */

function buildContentSecurityPolicy() {
  const supabaseOrigin = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return url ? new URL(url).origin : "";
    } catch {
      return "";
    }
  })();

  const connectSrc = [
    "'self'",
    supabaseOrigin,
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://maps.googleapis.com",
    "https://demo-api.vivapayments.com",
    "https://api.vivapayments.com",
    "https://demo-accounts.vivapayments.com",
    "https://accounts.vivapayments.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://imageproxy.wolt.com https://images.unsplash.com https://*.mapbox.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.vivapayments.com https://*.vivawallet.com",
  ].join("; ");
}

const productionSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

const nextConfig = {
  logging: {
    incomingRequests: false,
    serverFunctions: false,
  },
  experimental: {
    instrumentationHook: true,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ["192.168.31.224", "*.shares.zrok.io", "nixk-server.shares.zrok.io"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imageproxy.wolt.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [60, 70, 75, 80, 85, 90, 95],
  },
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/:path*",
          headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
        },
      ];
    }

    return [
      {
        source: "/:path*",
        headers: productionSecurityHeaders,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_VIVA_WEB_BASE_URL: process.env.NEXT_PUBLIC_VIVA_WEB_BASE_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_SW_VERSION: process.env.NEXT_PUBLIC_SW_VERSION,
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN,
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

const sentryEnabled = Boolean(process.env.SENTRY_DSN?.trim());

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  widenClientFileUpload: Boolean(process.env.SENTRY_AUTH_TOKEN),
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
};

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
