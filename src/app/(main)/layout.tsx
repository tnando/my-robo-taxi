'use client';

import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Main app layout — wraps all authenticated pages.
 * Provides the BottomNav shell. Auth gate will be added when NextAuth is integrated.
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {children}
      <BottomNav />
    </div>
  );
}
