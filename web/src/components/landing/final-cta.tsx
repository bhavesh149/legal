'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Lock } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-24 bg-[#0B0D0F] relative">
      <div className="mx-auto max-w-5xl px-6 relative z-10">
        <div className="rounded-3xl border border-[#22272E] bg-[#111417] p-10 md:p-16 text-center shadow-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#171A1E] px-4 py-1 text-xs font-semibold text-[#CBA96B] border border-[#CBA96B]/30">
            <Lock className="h-3.5 w-3.5 text-[#CBA96B]" /> Enterprise Zero Data Retention
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#F1F3F4] tracking-tight">
            Know what you&apos;re signing. <br />
            <span className="font-serif italic gold-gradient-text font-normal">
              Before you blind-sign away your rights.
            </span>
          </h2>

          <p className="text-[#88929A] text-base max-w-2xl mx-auto leading-relaxed">
            Turn complicated contracts into clear, actionable risk scores and professional pushback emails in under 30 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-13 px-8 text-base gold-button rounded-xl shadow-xl transition-all cursor-pointer uppercase tracking-wider text-xs font-bold">
                Analyze a Contract <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/scan">
              <Button size="lg" variant="outline" className="h-13 px-7 text-base border-[#22272E] bg-[#0B0D0F] text-[#F1F3F4] hover:bg-[#171A1E] rounded-xl cursor-pointer">
                Try free quick scan
              </Button>
            </Link>
          </div>

          <p className="text-xs text-[#88929A] pt-2 flex items-center justify-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-400" /> No credit card required for free scan
          </p>
        </div>
      </div>
    </section>
  );
}
