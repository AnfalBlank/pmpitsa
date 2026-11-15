import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Preventive Maintenance POS PINSYST & FMS | Pertamina International',
  description: 'Aplikasi Mobile Pemeriksaan Berkala POS PINSYST & Fuel Management System SPBU Pertamina International',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0B2545',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-slate-50">
      <body className="h-full text-slate-900 antialiased flex flex-col font-sans selection:bg-red-100 selection:text-red-900">
        {children}
      </body>
    </html>
  );
}

