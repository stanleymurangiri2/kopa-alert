"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type SidebarSectionProps = {
  title: string;
  collapsed?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SidebarSection({
  title,
  collapsed = false,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  if (collapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <details
      open={defaultOpen}
      className="group"
    >
      <summary
        className="
          flex
          cursor-pointer
          list-none
          items-center
          justify-between
          rounded-lg
          px-3
          py-2
          text-xs
          font-semibold
          uppercase
          tracking-wider
          text-gray-500
          transition-colors
          hover:bg-gray-100
        "
      >
        <span>{title}</span>

        <ChevronDown
          size={16}
          className="
            transition-transform
            duration-200
            group-open:rotate-180
          "
        />
      </summary>

      <div className="mt-2 space-y-1">
        {children}
      </div>
    </details>
  );
}