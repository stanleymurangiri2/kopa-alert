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
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
