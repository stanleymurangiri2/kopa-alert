"use client";

import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import SidebarShell, { type NavItem } from "@/components/layout/Sidebar";

const menu: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Pending Requests", href: "/admin/requests", icon: ClipboardList },
  { name: "Businesses", href: "/admin/businesses", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Reports", href: "/admin/reports", icon: FileText },
  { name: "Audit Logs", href: "/admin/audit", icon: ScrollText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar() {
  return <SidebarShell title="KopaAlert" subtitle="Super Admin" items={menu} />;
}
