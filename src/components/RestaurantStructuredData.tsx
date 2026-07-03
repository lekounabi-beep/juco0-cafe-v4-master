import { JUCO_CAFE_LOCATION } from "@/config/juco-cafe-location";
import { getSiteUrl, SITE_METADATA } from "@/config/site-metadata";

export function RestaurantStructuredData() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: JUCO_CAFE_LOCATION.name,
    url: siteUrl,
    description: SITE_METADATA.description,
    image: `${siteUrl}${SITE_METADATA.defaultOgImage}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: JUCO_CAFE_LOCATION.latitude,
      longitude: JUCO_CAFE_LOCATION.longitude,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nafpaktos",
      addressCountry: "GR",
    },
    sameAs: [`https://instagram.com/${SITE_METADATA.instagramHandle}`],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
