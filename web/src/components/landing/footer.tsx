'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#22272E] bg-[#0B0D0F] py-12 text-xs text-[#88929A]">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B]">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-bold text-[#F1F3F4] text-sm">LegalAgent AI</span>
          <span className="text-[#22272E]">|</span>
          <span>Private Contract Intelligence</span>
        </div>

        <div className="flex items-center gap-6 font-medium text-[#88929A]">
          <a href="#how-it-works" className="hover:text-[#F1F3F4] transition-colors">How it works</a>
          <a href="#negotiator" className="hover:text-[#F1F3F4] transition-colors">Pushback AI</a>
          <a href="#security" className="hover:text-[#F1F3F4] transition-colors">Security</a>
          <a href="#faq" className="hover:text-[#F1F3F4] transition-colors">FAQ</a>
          <Link href="/login" className="hover:text-[#F1F3F4] transition-colors">Login</Link>
          <Link href="/signup" className="hover:text-[#F1F3F4] transition-colors">Sign Up</Link>
        </div>

        <p className="text-[#88929A]">
          © {new Date().getFullYear()} LegalAgent Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
