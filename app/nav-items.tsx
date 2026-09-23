import { LayoutDashboard, ScanQrCode } from "lucide-react";
import type { NavItem } from "osp-ui-kit";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    bottomNav: true,
    bottomNavOrder: 0,
  },
  {
    label: "Scan QR",
    displayName: "Scan",
    icon: ScanQrCode,
    href: "/scan-qr",
    bottomNav: true,
    bottomNavOrder: 1,
  },
];
