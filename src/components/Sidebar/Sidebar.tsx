"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Circle, Zap } from "lucide-react";
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

  const widthClass = isMobile ? "w-72" : collapsed ? "w-[76px]" : "w-64";
  const showLabel = !collapsed || isMobile;

  const content = (
    <aside
      className={`
        ${widthClass}
        flex h-screen flex-col
        bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
        text-white border-r border-slate-800/60
        transition-all duration-300 ease-out
        ${isMobile ? "fixed left-0 top-0 z-50 shadow-2xl" : "sticky top-0 left-0"}
        ${isMobile && !mobileOpen ? "-translate-x-full" : "translate-x-0"}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
          <Zap className="h-5 w-5 text-white" fill="white" />
        </div>
        {showLabel && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menu.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon ?? Circle;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && closeMobile()}
              title={!showLabel ? item.name : undefined}
              aria-label={item.name}
              aria-current={active ? "page" : undefined}
              className={`
                group relative flex items-center gap-3 rounded-xl px-3 py-2.5
                text-sm transition-all duration-200
                ${!showLabel ? "justify-center" : ""}
                ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/15 to-blue-500/5 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-blue-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}

              <span
                className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                  transition-colors duration-200
                  ${active ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 group-hover:text-slate-200"}
                `}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>

              {showLabel && (
                <span className={`truncate ${active ? "font-medium" : ""}`}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="border-t border-slate-800/60 px-4 py-3">
        <div className={`flex items-center gap-2 ${!showLabel ? "justify-center" : ""}`}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {showLabel && (
            <span className="text-xs text-slate-500">All systems online</span>
          )}
        </div>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            onClick={closeMobile}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
        {content}
      </>
    );
  }

  return content;
}

