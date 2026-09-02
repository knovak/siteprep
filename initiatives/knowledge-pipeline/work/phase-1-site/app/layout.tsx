import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_ORIGIN ?? 'http://localhost:3000'),
  title: 'Knowledge Pipeline',
  description:
    'A private, auditable workspace for turning collected sources into curated topic documents.',
  openGraph: {
    title: 'Knowledge Pipeline',
    description: 'Keep the evidence. Make the judgement visible.',
    images: [{url: '/og.png', width: 1731, height: 909, alt: 'Knowledge Pipeline — Keep the evidence. Make the judgement visible.'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knowledge Pipeline',
    description: 'Keep the evidence. Make the judgement visible.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
