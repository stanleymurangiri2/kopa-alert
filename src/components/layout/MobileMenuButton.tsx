"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export default function MobileMenuButton() {
  const { openMobile } = useSidebar();

  return (
    <button
      type="button"
      onClick={openMobile}
      aria-label="Open sidebar"
      className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
