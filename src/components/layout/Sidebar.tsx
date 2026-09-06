"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  items: NavItem[];
}

function isActive(pathname: string, href: string, items: NavItem[]) {
  if (pathname === href) {
    return true;
  }

  if (!pathname.startsWith(`${href}/`)) {
    return false;
  }

  // A nested path belongs to the deepest matching item only.
  return !items.some(
    (item) =>
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
}

export default function Sidebar({ title, subtitle, items }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();

  return (
    <>
      <div
        aria-hidden="true"
        onClick={closeMobile}
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden shrink-0 rounded-lg p-2 transition-colors hover:bg-sidebar-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent md:block"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-sidebar-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent md:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ${
              collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
            }`}
          >
            <p className="truncate text-lg font-extrabold uppercase leading-tight tracking-wide">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-sidebar-foreground/60">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(pathname, item.href, items);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent ${
                  active
                    ? "bg-sidebar-active text-sidebar-active-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-hover hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />

                <span
                  className={`truncate transition-all duration-300 ${
                    collapsed ? "md:w-0 md:opacity-0" : "opacity-100"
                  }`}
                >
                  {item.name}
                </span>

                {collapsed ? (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-sidebar-hover px-2 py-1 text-xs text-sidebar-foreground opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
                  >
                    {item.name}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
