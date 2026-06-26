import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
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

export const metadata: Metadata = {
  title: "Juco — Fresh Juices & Quality Coffee",
  description: "Juco Coffee & Juice Bar in Nafpaktos — fresh juices, specialty coffee, smoothies & snacks.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Juco Cafe",
  },
};

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
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen font-sans`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PWA_LEGACY_PURGE_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider defaultTheme="dark" attribute="class">
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
