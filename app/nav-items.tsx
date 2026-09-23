import { LayoutDashboard } from "lucide-react";
import type { NavItem } from "osp-ui-kit";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    bottomNav: true,
    bottomNavOrder: 0,
  },
];
