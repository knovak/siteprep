import type {ReactNode} from "react";

export const metadata = {
  title: "Tide Here",
  description: "Five coast-local days of tide, sun, and moon times.",
};

export default function RootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
