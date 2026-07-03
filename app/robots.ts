import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/driver",
        "/driver/",
        "/superadmin",
        "/superadmin/",
        "/account",
        "/account/",
        "/api/",
        "/checkout",
        "/order-success",
        "/track/",
        "/auth/",
        "/offline",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
