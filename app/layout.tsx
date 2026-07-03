import type { Viewport } from "next";
import "./globals.css";
import { RestaurantStructuredData } from "@/components/RestaurantStructuredData";
import { createRootMetadata, SITE_METADATA } from "@/config/site-metadata";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { CustomerOfflineIndicator } from "@/components/CustomerOfflineIndicator";
import { PwaDevCleanup } from "@/components/PwaDevCleanup";
import { NotificationSoundInit } from "@/features/notifications/components/NotificationSoundInit";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PWA_LEGACY_PURGE_SCRIPT } from "@/lib/pwa-legacy-purge";
import { Space_Grotesk, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata = createRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E8F529",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE_METADATA.language}
      className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen font-sans`}
      suppressHydrationWarning
    >
      <head>
        <RestaurantStructuredData />
        <script dangerouslySetInnerHTML={{ __html: PWA_LEGACY_PURGE_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <PwaDevCleanup />
        <ThemeProvider defaultTheme="dark" attribute="class">
          <CustomerOfflineIndicator />
          {children}
        </ThemeProvider>
        <PwaInstallBanner />
        <Toaster />
        <NotificationSoundInit />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
