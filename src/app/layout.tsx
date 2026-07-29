// Ignore TypeScript error for side-effect CSS import (no type declarations)
// @ts-ignore
import './globals.css';

import { SidebarProvider, Sidebar } from "@/components/Sidebar";

export const metadata = {
  title: 'KopaAlert - Business Debt Reminder',
  description: 'Multi-tenant debt reminder system for small businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar menu={[]} title="KopaAlert" />

            <main className="flex-1">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}