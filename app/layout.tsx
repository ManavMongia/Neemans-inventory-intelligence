import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: "Neeman's · Inventory Intelligence",
  description: 'AI-powered inventory management dashboard with automated insights for Neeman\'s merino wool brand',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
