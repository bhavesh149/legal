import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'SafeSign — Private AI Legal Agent & Contract Vault',
  description: 'Instant risk scores, zero data retention, local PII scrub, clause redlines, and pushback generation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${instrumentSerif.variable}`}>
      <body className="bg-[#0B0D0F] text-[#F1F3F4] antialiased selection:bg-[#CBA96B]/30 selection:text-[#E0C58A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
