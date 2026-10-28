import {
  Dashboard as DashboardIcon,
  Translate as TranslateIcon,
  Book as BookIcon,
  Hotel as HotelIcon,
  Emergency as EmergencyIcon,
  AccountBalance as CultureIcon,
  Explore as ExploreIcon,
} from "@mui/icons-material";

/**
 * Single source of truth for primary navigation.
 * - Desktop (Navbar) shows every item in this order.
 * - Mobile (BottomNav) shows `mobile: "tab"` items as tabs and the rest
 *   under a "More" sheet.
 * - `match` lists extra path prefixes that should mark the item active.
 */
export const NAV_ITEMS = [
  { label: "Home", to: "/home", icon: DashboardIcon, mobile: "tab" },
  { label: "Translate", to: "/translation", icon: TranslateIcon, mobile: "tab" },
  { label: "Phrasebook", to: "/phrasebook", icon: BookIcon, mobile: "tab" },
  { label: "Stays", to: "/stays", icon: HotelIcon, mobile: "more", match: ["/saved-stays"] },
  { label: "Emergency", to: "/emergency", icon: EmergencyIcon, mobile: "more" },
  { label: "Culture", to: "/cultural-guide", icon: CultureIcon, mobile: "more" },
  {
    label: "Explore",
    to: "/destinations",
    icon: ExploreIcon,
    mobile: "tab",
    match: ["/discover"],
  },
];

export function isNavItemActive(item, pathname) {
  const prefixes = [item.to, ...(item.match || [])];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const MOBILE_TABS = NAV_ITEMS.filter((item) => item.mobile === "tab");
export const MOBILE_MORE = NAV_ITEMS.filter((item) => item.mobile === "more");
