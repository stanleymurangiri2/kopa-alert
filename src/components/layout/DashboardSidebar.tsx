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

const items: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Debts", href: "/debts", icon: Receipt },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports/debts", icon: FileText },
  { name: "Settings", href: "/settings/profile", icon: Settings },
];

export default function DashboardSidebar({
  businessName,
}: {
  businessName: string;
}) {
  return <Sidebar title="KopaAlert" subtitle={businessName} items={items} />;
}
