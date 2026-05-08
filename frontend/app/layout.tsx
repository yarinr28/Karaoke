import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Karaoke',
  description: 'AI-Powered Party Karaoke',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
