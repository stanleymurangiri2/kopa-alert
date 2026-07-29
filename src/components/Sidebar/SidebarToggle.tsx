"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./SidebarProvider";

export function SidebarToggle() {
  const {
    collapsed,
    isMobile,
    mobileOpen,
    toggleSidebar,
    toggleMobile,
  } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      toggleMobile();
    } else {
      toggleSidebar();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isMobile
          ? mobileOpen
            ? "Close sidebar"
            : "Open sidebar"
          : collapsed
            ? "Expand sidebar"
            : "Collapse sidebar"
      }
      aria-expanded={isMobile ? mobileOpen : !collapsed}
      className="
        inline-flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        border
        border-gray-200
        bg-white
        text-gray-700
        transition-all
        duration-200
        hover:bg-gray-100
        hover:text-blue-600
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-offset-2
        active:scale-95
      "
    >
      {isMobile ? (
        <Menu className="h-5 w-5" />
      ) : collapsed ? (
        <PanelLeftOpen className="h-5 w-5" />
      ) : (
        <PanelLeftClose className="h-5 w-5" />
      )}
    </button>
  );
}