// Ignore TypeScript error for side-effect CSS import (no type declarations)
// @ts-ignore
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}