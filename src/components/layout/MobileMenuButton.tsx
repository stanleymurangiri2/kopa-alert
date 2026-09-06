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
      className="rounded-lg p-2 text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
