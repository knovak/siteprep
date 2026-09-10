import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Flings',
  referrer: 'no-referrer',
  description: 'Your gatherings, invitations and member details.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
