import type { Metadata } from "next";
import { env } from "@/config/env";

/** Normalized site origin (no trailing slash). Driven by NEXT_PUBLIC_BASE_URL. */
export function getSiteUrl(): string {
  return env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
}

export const SITE_METADATA = {
  siteName: "Juco",
  title: "Juco — Fresh Juices & Quality Coffee",
  description:
    "Juco Coffee & Juice Bar in Nafpaktos — fresh juices, specialty coffee, smoothies & snacks.",
  locale: "el_GR",
  language: "el",
  defaultOgImage: "/icon-512.png",
  instagramHandle: "juco.nafpaktos",
} as const;

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

export function createRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_METADATA.title,
      template: `%s | ${SITE_METADATA.siteName}`,
    },
    description: SITE_METADATA.description,
    applicationName: SITE_METADATA.siteName,
    alternates: {
      canonical: "/",
      languages: {
        "el-GR": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: SITE_METADATA.locale,
      url: siteUrl,
      siteName: SITE_METADATA.siteName,
      title: SITE_METADATA.title,
      description: SITE_METADATA.description,
      images: [
        {
          url: SITE_METADATA.defaultOgImage,
          width: 512,
          height: 512,
          alt: "Juco Cafe",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: SITE_METADATA.title,
      description: SITE_METADATA.description,
      images: [SITE_METADATA.defaultOgImage],
    },
    manifest: "/manifest-customer.json",
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Juco Cafe",
    },
  };
}
