"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { SidebarToggle } from "./SidebarToggle";
import { SidebarItem } from "./SidebarItem";
import { useSidebar } from "./SidebarProvider";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type SidebarProps = {
  title?: string;
  logo?: React.ReactNode;
  items?: MenuItem[];
};

const defaultItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Businesses",
    href: "/admin/businesses",
    icon: Building2,
  },
  {
    label: "Requests",
    href: "/admin/requests",
    icon: FileText,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Employees",
    href: "/employees",
    icon: UserCog,
  },
  {
    label: "Debtors",
    href: "/debtors",
    icon: CreditCard,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({
  title = "Kopa Alert",
  logo,
  items = defaultItems,
}: SidebarProps) {
  const pathname = usePathname();

  const {
    collapsed,
    mobileOpen,
    isMobile,
    closeMobile,
  } = useSidebar();

  const sidebar = (
    <aside
      className={`
        fixed
        top-0
        left-0
        z-50
        h-screen
        border-r
        bg-white
        shadow-xl
        transition-all
        duration-300
        ease-in-out
        ${collapsed ? "w-[72px]" : "w-[260px]"}
        ${isMobile
          ? mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
          : "translate-x-0"}
      `}
    >
      <div className="flex h-full flex-col">

        <div className="flex items-center justify-between border-b p-4">

          <div className="flex items-center gap-3 overflow-hidden">

            {logo ?? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                KA
              </div>
            )}

            {!collapsed && (
              <div className="overflow-hidden">
                <h2 className="truncate text-lg font-bold">
                  {title}
                </h2>
              </div>
            )}

          </div>

          <SidebarToggle />

        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">

          {items.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`)
              }
              collapsed={collapsed}
              onClick={() => {
                if (isMobile) {
                  closeMobile();
                }
              }}
            />
          ))}

        </nav>

        <div className="border-t p-3">

          <Link
            href="/logout"
            className={`
              flex
              items-center
              rounded-xl
              px-3
              py-3
              transition
              hover:bg-red-50
              hover:text-red-600
            `}
          >
            <LogOut size={20} />

            {!collapsed && (
              <span className="ml-3 font-medium">
                Logout
              </span>
            )}
          </Link>

        </div>

      </div>
    </aside>
  );

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      {sidebar}

      {!isMobile && (
        <div
          className={`transition-all duration-300 ${
            collapsed ? "w-[72px]" : "w-[260px]"
          }`}
        />
      )}
    </>
  );
}