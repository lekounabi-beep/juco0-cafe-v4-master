import { DriverGuard } from '@/features/driver/components/DriverGuard';
import { DriverGoogleMapsPreload } from '@/features/driver/components/DriverGoogleMapsPreload';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverGuard>
      <DriverGoogleMapsPreload />
      {children}
    </DriverGuard>
  );
}
