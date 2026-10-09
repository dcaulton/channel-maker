import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Channel designer',
  description: 'Frame for the channel-maker designer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
