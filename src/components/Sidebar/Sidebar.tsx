"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Circle } from "lucide-react";
import { useSidebar } from "./SidebarProvider";

export type MenuItem = {
  name: string;
  href: string;
  icon?: LucideIcon;
};

interface SidebarProps {
  menu: MenuItem[];
  title: string;
  subtitle?: string;
}

export function Sidebar({ menu, title, subtitle }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, isMobile, mobileOpen, closeMobile } = useSidebar();

  const widthClass = isMobile ? "w-72" : collapsed ? "w-[72px]" : "w-64";

  const content = (
    <aside
      className={`
        ${widthClass}
        flex h-screen flex-col
        bg-slate-900 text-white
        transition-all duration-200
        ${isMobile ? "fixed left-0 top-0 z-50" : "relative"}
        ${isMobile && !mobileOpen ? "-translate-x-full" : "translate-x-0"}
      `}
    >
      <div className="border-b border-slate-700 p-4">
        {(!collapsed || isMobile) ? (
          <>
            <h1 className="truncate text-xl font-bold">{title}</h1>
            {subtitle && (
              <p className="mt-1 truncate text-sm text-slate-400">
                {subtitle}
              </p>
            )}
          </>
        ) : (
          <div className="flex justify-center text-lg font-bold">
            {title.charAt(0)}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon ?? Circle;
          const showLabel = !collapsed || isMobile;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && closeMobile()}
              title={!showLabel ? item.name : undefined}
              aria-label={item.name}
              aria-current={active ? "page" : undefined}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5
                transition-colors duration-150
                ${active ? "bg-blue-600" : "hover:bg-slate-800"}
                ${!showLabel ? "justify-center" : ""}
              `}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabel && (
                <span className="truncate text-sm">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            onClick={closeMobile}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50"
          />
        )}
        {content}
      </>
    );
  }

  return content;
}