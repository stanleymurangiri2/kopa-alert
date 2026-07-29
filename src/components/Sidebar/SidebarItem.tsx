"use client";

import Link from "next/link";
import { type ElementType } from "react";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: ElementType;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
};

export function SidebarItem({
  href,
  label,
  icon: Icon,
  active = false,
  collapsed = false,
  onClick,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`
        group
        relative
        flex
        items-center
        rounded-xl
        px-3
        py-3
        transition-all
        duration-200
        outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        ${
          active
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
        }
      `}
    >
      <Icon
        size={20}
        className="shrink-0"
      />

      {!collapsed && (
        <span className="ml-3 flex-1 truncate text-sm font-medium">
          {label}
        </span>
      )}

      {collapsed && (
        <span
          role="tooltip"
          className="
            pointer-events-none
            absolute
            left-full
            top-1/2
            z-50
            ml-3
            -translate-y-1/2
            whitespace-nowrap
            rounded-md
            bg-gray-900
            px-2
            py-1
            text-xs
            text-white
            opacity-0
            shadow-lg
            transition-opacity
            duration-200
            group-hover:opacity-100
            group-focus-visible:opacity-100
          "
        >
          {label}
        </span>
      )}
    </Link>
  );
}