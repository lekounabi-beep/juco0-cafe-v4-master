import { DriverGuard } from '@/features/driver/components/DriverGuard';

export default function DriverAppLayout({ children }: { children: React.ReactNode }) {
  return <DriverGuard>{children}</DriverGuard>;
}