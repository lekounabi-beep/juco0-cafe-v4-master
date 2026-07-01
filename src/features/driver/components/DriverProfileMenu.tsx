'use client';

import { useCallback, useRef, useState } from 'react';
import { LogOut, RefreshCw, Truck, User, Wifi, WifiOff } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDriverLogout } from '@/features/driver/hooks/useDriverLogout';
import { DRIVER_AVAILABILITY } from '@/features/delivery/types/delivery.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type DriverProfile = {
  full_name: string;
  vehicle_type: string;
};

export interface DriverProfileMenuProps {
  driverProfile: DriverProfile | null;
  isOnDelivery: boolean;
  availabilityStatus: string;
  /** Hide the header status badge — use when parent renders status separately. */
  hideStatusBadge?: boolean;
  /** Menu-only mode: avatar trigger without wrapping header chrome. */
  minimal?: boolean;
}

type StatusInfo = {
  label: 'Online' | 'Busy' | 'Offline';
  emoji: string;
  colorClass: string;
  Icon: typeof Wifi;
};

function resolveStatus(isOnDelivery: boolean, availabilityStatus: string): StatusInfo {
  if (isOnDelivery) {
    return { label: 'Busy', emoji: '🟡', colorClass: 'text-amber-400', Icon: Truck };
  }
  if (availabilityStatus === DRIVER_AVAILABILITY.ONLINE) {
    return { label: 'Online', emoji: '🟢', colorClass: 'text-green-400', Icon: Wifi };
  }
  return { label: 'Offline', emoji: '🔴', colorClass: 'text-red-400', Icon: WifiOff };
}

const menuSurfaceClass =
  'border-white/10 bg-black/95 text-white backdrop-blur-xl shadow-xl';

const sheetItemClass =
  'flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';

function ProfileSummary({
  driverName,
  vehicleType,
  status,
}: {
  driverName: string;
  vehicleType: string;
  status: StatusInfo;
}) {
  const { Icon } = status;

  return (
    <div className="px-1 py-1">
      <p className="text-sm font-semibold text-white/90">
        <span aria-hidden>👤</span> Driver profile
      </p>
      <p className="mt-2 text-base font-semibold text-white">{driverName}</p>
      <p className="mt-0.5 text-xs text-white/60">{vehicleType}</p>
      <div className={cn('mt-2 flex items-center gap-1.5 text-xs font-semibold', status.colorClass)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{status.label}</span>
      </div>
    </div>
  );
}

function DriverMenuActions({
  variant,
  status,
  onRefresh,
  onLogout,
}: {
  variant: 'sheet' | 'dropdown';
  status: StatusInfo;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenuItem
          disabled
          className="min-h-10 cursor-default text-white/80 focus:bg-transparent"
        >
          <span aria-hidden>{status.emoji}</span>
          {status.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onSelect={onRefresh}
          className="min-h-10 cursor-pointer text-white focus:bg-white/10 focus:text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          <span aria-hidden>🔄</span> Refresh app
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onSelect={onLogout}
          className="min-h-10 cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span aria-hidden>🚪</span> Logout
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <div role="menu" aria-label="Driver profile actions" className="space-y-1">
      <div
        role="menuitem"
        aria-disabled="true"
        className={cn(sheetItemClass, 'cursor-default text-white/80 hover:bg-transparent')}
      >
        <span aria-hidden>{status.emoji}</span>
        {status.label}
      </div>
      <div className="my-2 h-px bg-white/10" role="separator" />
      <button type="button" role="menuitem" className={sheetItemClass} onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        <span aria-hidden>🔄</span> Refresh app
      </button>
      <div className="my-2 h-px bg-white/10" role="separator" />
      <button
        type="button"
        role="menuitem"
        className={cn(sheetItemClass, 'text-red-400 hover:bg-red-500/10')}
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span aria-hidden>🚪</span> Logout
      </button>
    </div>
  );
}

export function DriverProfileMenu({
  driverProfile,
  isOnDelivery,
  availabilityStatus,
  hideStatusBadge = false,
  minimal = false,
}: DriverProfileMenuProps) {
  const isMobile = useIsMobile();
  const logout = useDriverLogout();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const driverName = driverProfile?.full_name || 'Οδηγός';
  const vehicleType = driverProfile?.vehicle_type || 'Μέσο';
  const status = resolveStatus(isOnDelivery, availabilityStatus);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setOpen(false);
    window.location.reload();
  }, []);

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
  }, [logout]);

  const avatarButton = (
    <button
      ref={triggerRef}
      type="button"
      aria-label="Open driver profile menu"
      aria-haspopup={isMobile ? 'dialog' : 'menu'}
      aria-expanded={open}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-offset-background transition hover:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <User className="h-5 w-5 text-primary" aria-hidden />
    </button>
  );

  const menuTrigger = isMobile ? (
    avatarButton
  ) : (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{avatarButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          menuSurfaceClass,
          'min-w-[15rem] p-2',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=open]:duration-200 data-[state=closed]:duration-150'
        )}
      >
        <div className="px-2 py-2">
          <ProfileSummary driverName={driverName} vehicleType={vehicleType} status={status} />
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DriverMenuActions
          variant="dropdown"
          status={status}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const mobileSheet = isMobile && (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          menuSurfaceClass,
          'rounded-t-2xl border-t px-4 pb-8 pt-6',
          'data-[state=open]:duration-200 data-[state=closed]:duration-150',
          '[&>button.absolute]:hidden'
        )}
      >
        <SheetTitle className="sr-only">Driver profile menu</SheetTitle>
        <ProfileSummary driverName={driverName} vehicleType={vehicleType} status={status} />
        <div className="my-4 h-px bg-white/10" />
        <DriverMenuActions
          variant="sheet"
          status={status}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      </SheetContent>
    </Sheet>
  );

  if (minimal) {
    return (
      <>
        {menuTrigger}
        {mobileSheet}
      </>
    );
  }

  const StatusIcon = status.Icon;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {menuTrigger}

          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{driverName}</p>
            <p className="text-xs text-white/60">{vehicleType}</p>
          </div>
        </div>

        {!hideStatusBadge && (
          <div
            className={cn('flex shrink-0 items-center gap-1', status.colorClass)}
            aria-label={`Availability: ${status.label}`}
          >
            <StatusIcon className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold">{status.label}</span>
          </div>
        )}
      </div>

      {mobileSheet}
    </header>
  );
}
