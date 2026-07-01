import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CreditCard,
  Flag,
  LayoutDashboard,
  ScrollText,
  Server,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from "lucide-react";

export type SuperAdminNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const SUPERADMIN_NAV_ITEMS: SuperAdminNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/superadmin",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/superadmin",
  },
  {
    id: "stores",
    label: "Stores",
    href: "/superadmin/stores",
    icon: Store,
    match: (pathname) => pathname.startsWith("/superadmin/stores"),
  },
  {
    id: "orders",
    label: "Orders",
    href: "/superadmin/orders",
    icon: ShoppingBag,
    match: (pathname) => pathname.startsWith("/superadmin/orders"),
  },
  {
    id: "drivers",
    label: "Drivers",
    href: "/superadmin/drivers",
    icon: Truck,
    match: (pathname) => pathname.startsWith("/superadmin/drivers"),
  },
  {
    id: "customers",
    label: "Customers",
    href: "/superadmin/customers",
    icon: Users,
    match: (pathname) => pathname.startsWith("/superadmin/customers"),
  },
  {
    id: "payments",
    label: "Payments",
    href: "/superadmin/payments",
    icon: CreditCard,
    match: (pathname) => pathname.startsWith("/superadmin/payments"),
  },
  {
    id: "monitoring",
    label: "Monitoring",
    href: "/superadmin/monitoring",
    icon: Activity,
    match: (pathname) => pathname.startsWith("/superadmin/monitoring"),
  },
  {
    id: "logs",
    label: "Logs",
    href: "/superadmin/logs",
    icon: ScrollText,
    match: (pathname) => pathname.startsWith("/superadmin/logs"),
  },
  {
    id: "flags",
    label: "Feature Flags",
    href: "/superadmin/flags",
    icon: Flag,
    match: (pathname) => pathname.startsWith("/superadmin/flags"),
  },
  {
    id: "system",
    label: "System",
    href: "/superadmin/system",
    icon: Server,
    match: (pathname) => pathname.startsWith("/superadmin/system"),
  },
  {
    id: "settings",
    label: "Settings",
    href: "/superadmin/settings",
    icon: Settings,
    match: (pathname) => pathname.startsWith("/superadmin/settings"),
  },
];
