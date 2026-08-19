'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Profile', href: '/settings/profile' },
  { name: 'Business', href: '/settings/business' },
  { name: 'Team', href: '/settings/team' },

  { name: 'Notification Templates', href: '/settings/templates' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap gap-2 border-b">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
