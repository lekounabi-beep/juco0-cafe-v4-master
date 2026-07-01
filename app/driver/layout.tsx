import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Juco Driver',
  description: 'Professional delivery driver application for Juco Cafe',
  manifest: '/manifest-driver.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Juco Driver',
  },
};

export default function DriverRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
