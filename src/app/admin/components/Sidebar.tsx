"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  {
    name: "Dashboard",
    href: "/admin",
  },
  {
    name: "Pending Requests",
    href: "/admin/requests",
  },
  {
    name: "Businesses",
    href: "/admin/businesses",
  },
  {
    name: "Users",
    href: "/admin/users",
  },
  {
    name: "Reports",
    href: "/admin/reports",
  },
  {
    name: "Audit Logs",
    href: "/admin/audit",
  },
  {
    name: "Settings",
    href: "/admin/settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen">

      <div className="border-b border-slate-700 p-6">

        <h1 className="text-2xl font-bold">
          KopaAlert
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Super Admin
        </p>

      </div>

      <nav className="p-4 space-y-2">

        {menu.map((item) => {

          const active =
            pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 transition ${
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
}