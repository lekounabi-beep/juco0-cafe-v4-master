/**
 * Driver Header — renders the profile menu (avatar, name, availability).
 */

import { DriverProfileMenu, type DriverProfileMenuProps } from '@/features/driver/components/DriverProfileMenu';

export type DriverHeaderProps = DriverProfileMenuProps;

export function DriverHeader(props: DriverHeaderProps) {
  return <DriverProfileMenu {...props} />;
}
