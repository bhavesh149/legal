'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B0D0F]/90 backdrop-blur-xl border-b border-[#22272E] py-3.5 shadow-2xl shadow-black/80'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171A1E] border border-[#CBA96B]/40 text-[#CBA96B] font-bold shadow-md group-hover:border-[#CBA96B] transition-colors">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#F1F3F4] flex items-center gap-2">
              LegalAgent
              <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-[#171A1E] text-[#CBA96B] border border-[#CBA96B]/30">
                Private Agent
              </span>
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-[#88929A]">
          <a href="#how-it-works" className="hover:text-[#F1F3F4] transition-colors">How it works</a>
          <a href="#negotiator" className="hover:text-[#F1F3F4] transition-colors">Pushback AI</a>
          <a href="#security" className="hover:text-[#F1F3F4] transition-colors">Security</a>
          <a href="#comparison" className="hover:text-[#F1F3F4] transition-colors">Comparison</a>
          <a href="#faq" className="hover:text-[#F1F3F4] transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-[#88929A] hover:text-[#F1F3F4] hover:bg-[#171A1E] text-xs font-semibold cursor-pointer">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="gold-button rounded-xl px-5 py-2 text-xs uppercase tracking-wider cursor-pointer shadow-lg">
              Try for Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
