'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ContractScanner } from './contract-scanner';
import { Shield, Zap, ArrowRight, Lock } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] pt-36 pb-24 flex items-center overflow-hidden bg-[#0B0D0F]">
      <div className="mx-auto max-w-7xl px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          
          {/* Left Column: Spacious & Minimalist Headline */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="lg:col-span-7 space-y-8 text-left"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#171A1E] px-4 py-1.5 text-xs font-semibold text-[#CBA96B] border border-[#CBA96B]/30">
              <span className="flex h-2 w-2 rounded-full bg-[#CBA96B] animate-pulse" />
              AI Legal Agent & Privacy Shield
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#F1F3F4] tracking-tight leading-[1.12]">
              Understand any contract <br />
              in <span className="font-serif italic gold-gradient-text font-normal">seconds, not hours.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-[#88929A] max-w-xl font-normal leading-relaxed">
              Upload your PDF for instant risk scoring, line-level redlines, local PII anonymization, and pushback emails to negotiate without sounding difficult.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link href="/upload">
                <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-base gold-button rounded-xl shadow-xl transition-all cursor-pointer uppercase tracking-wider text-xs">
                  Analyze my contract <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/scan">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-13 px-7 text-base border-[#22272E] bg-[#111417] text-[#F1F3F4] hover:bg-[#171A1E] rounded-xl cursor-pointer">
                  Free quick scan
                </Button>
              </Link>
            </div>

            {/* Trust Features */}
            <div className="pt-8 border-t border-[#22272E] grid grid-cols-3 gap-6 text-xs font-medium text-[#88929A]">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#CBA96B] shrink-0" />
                <span>Zero Data Retention</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#E0C58A] shrink-0" />
                <span>&lt; 30s Scan Speed</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Source Grounded</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Clean Contract Scanner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <ContractScanner />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
