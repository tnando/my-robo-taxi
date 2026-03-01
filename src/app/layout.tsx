import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AuthProvider } from '@/components/layout/AuthProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MyRoboTaxi',
  description: 'Track your Tesla vehicles in real time',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
