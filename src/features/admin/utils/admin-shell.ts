export const ADMIN_SECTION = {
  ORDERS: "orders",
  PRODUCTS: "products",
  DRIVERS: "drivers",
  SETTINGS: "settings",
} as const;

export type AdminSection = (typeof ADMIN_SECTION)[keyof typeof ADMIN_SECTION];

export type AdminNavItem = {
  id: AdminSection;
  label: string;
  href: string;
  match: (pathname: string, section: string | null) => boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: ADMIN_SECTION.ORDERS,
    label: "Orders",
    href: "/admin?section=orders",
    match: (pathname, section) =>
      pathname === "/admin" && (section == null || section === "orders"),
  },
  {
    id: ADMIN_SECTION.PRODUCTS,
    label: "Products",
    href: "/admin/menu?section=products",
    match: (pathname, section) =>
      pathname === "/admin/menu" && (section == null || section === "products"),
  },
  {
    id: ADMIN_SECTION.DRIVERS,
    label: "Drivers",
    href: "/admin?section=drivers",
    match: (pathname, section) => pathname === "/admin" && section === "drivers",
  },
  {
    id: ADMIN_SECTION.SETTINGS,
    label: "Settings",
    href: "/admin/menu?section=settings",
    match: (pathname, section) => pathname === "/admin/menu" && section === "settings",
  },
];

export function getAdminSectionFromSearch(
  pathname: string,
  section: string | null | undefined,
): AdminSection {
  if (pathname === "/admin/menu") {
    return section === ADMIN_SECTION.SETTINGS ? ADMIN_SECTION.SETTINGS : ADMIN_SECTION.PRODUCTS;
  }
  return section === ADMIN_SECTION.DRIVERS ? ADMIN_SECTION.DRIVERS : ADMIN_SECTION.ORDERS;
}
