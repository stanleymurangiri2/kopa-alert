"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  name: string;
  href: string;
};

interface SidebarProps {
  menu: MenuItem[];
  title: string;
  subtitle?: string;
}

export function Sidebar({
  menu,
  title,
  subtitle,
}: SidebarProps) {

  const pathname = usePathname();

  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen">

      <div className="border-b border-slate-700 p-6">

        <h1 className="text-2xl font-bold">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">
            {subtitle}
          </p>
        )}

      </div>


      <nav className="p-4 space-y-2">

        {menu.map((item)=>{

          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 ${
                active
                ? "bg-blue-600"
                : "hover:bg-slate-800"
              }`}
            >
              {item.name}
            </Link>
          );

        })}

      </nav>

    </aside>
  );
}```