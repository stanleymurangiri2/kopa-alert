"use client";

import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import Sidebar, { type NavItem } from "./Sidebar";

const allItems: (NavItem & { adminOnly?: boolean })[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Debts", href: "/debts", icon: Receipt },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3, adminOnly: true },
  { name: "Reports", href: "/reports/debts", icon: FileText, adminOnly: true },
  { name: "Settings", href: "/settings/profile", icon: Settings, adminOnly: true },
];

export default function DashboardSidebar({
  businessName,
  role,
}: {
  businessName: string;
  role?: string;
}) {
  const isAdmin = role === "business_admin" || role === "super_admin";

  const items = allItems.filter((item) => !item.adminOnly || isAdmin);

  return <Sidebar title="KopaAlert" subtitle={businessName} items={items} />;
}