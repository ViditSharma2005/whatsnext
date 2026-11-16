import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Whats Next... — Your contest calendar', description: 'The next coding contest, your entire week, and a little push to get started.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
