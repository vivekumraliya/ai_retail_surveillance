import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'AI Retail Surveillance',
  description: 'A virtual web demo simulating an AI Retail Smart Surveillance & Theft Detection System with live tracking and behavioral analytics.',
  openGraph: {
    title: 'AI Retail Surveillance',
    description: 'A virtual web demo simulating an AI Retail Smart Surveillance & Theft Detection System with live tracking and behavioral analytics.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
