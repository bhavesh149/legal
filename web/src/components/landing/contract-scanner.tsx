'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, CheckCircle2, FileText, Shield } from 'lucide-react';

export function ContractScanner() {
  const [scrubbed, setScrubbed] = useState(false);
  const [activeTab, setActiveTab] = useState<'pii' | 'risk'>('pii');

  useEffect(() => {
    const interval = setInterval(() => {
      setScrubbed((prev) => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Main glass card with Velvet Obsidian styling */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="relative rounded-2xl border border-[#22272E] bg-[#111417] p-6 shadow-2xl shadow-black/90"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[#22272E] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F1F3F4] flex items-center gap-2">
                MSA_Vendor_2026.pdf
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Live Scan
                </span>
              </h3>
              <p className="text-xs text-[#88929A]">Master Services Agreement · 14 Pages</p>
            </div>
          </div>
          <div className="flex gap-1 bg-[#0B0D0F] p-1 rounded-lg border border-[#22272E] text-xs">
            <button
              onClick={() => setActiveTab('pii')}
              className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'pii' ? 'bg-[#171A1E] text-[#CBA96B] font-semibold border border-[#CBA96B]/30' : 'text-[#88929A] hover:text-[#F1F3F4]'
              }`}
            >
              PII Scrub
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'risk' ? 'bg-[#171A1E] text-[#CBA96B] font-semibold border border-[#CBA96B]/30' : 'text-[#88929A] hover:text-[#F1F3F4]'
              }`}
            >
              Risk Flags
            </button>
          </div>
        </div>

        {/* Live scanning line overlay */}
        <div className="relative overflow-hidden rounded-xl border border-[#22272E] bg-[#0B0D0F] p-4 text-xs font-mono">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#CBA96B] to-transparent animate-scanline z-20" />

          {/* Contract preview snippet */}
          <div className="space-y-3 relative z-10 text-[#F1F3F4]">
            <p className="text-[11px] text-[#88929A] uppercase tracking-wider font-sans font-semibold mb-1">
              Section 14.2 — Intellectual Property & Liability
            </p>

            <div className="leading-relaxed p-3.5 rounded-lg bg-[#111417] border border-[#22272E] text-[#F1F3F4]">
              This Agreement is entered into by and between{' '}
              <AnimatePresence mode="wait">
                {scrubbed ? (
                  <motion.span
                    key="scrubbed-person"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-[#CBA96B]/15 text-[#E0C58A] border border-[#CBA96B]/30"
                  >
                    <Lock className="h-3 w-3 text-[#CBA96B]" /> [PERSON_1]
                  </motion.span>
                ) : (
                  <motion.span
                    key="raw-person"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-[#F1F3F4] underline decoration-dashed"
                  >
                    Johnathan E. Doe
                  </motion.span>
                )}
              </AnimatePresence>{' '}
              for total compensation of{' '}
              <AnimatePresence mode="wait">
                {scrubbed ? (
                  <motion.span
                    key="scrubbed-money"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-[#CBA96B]/15 text-[#E0C58A] border border-[#CBA96B]/30"
                  >
                    <Lock className="h-3 w-3 text-[#CBA96B]" /> [AMOUNT_1]
                  </motion.span>
                ) : (
                  <motion.span
                    key="raw-money"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-[#F1F3F4] underline decoration-dashed"
                  >
                    $150,000 USD
                  </motion.span>
                )}
              </AnimatePresence>
              . Contractor agrees to grant Perpetual & Exclusive rights worldwide...
            </div>

            {/* Simulated AI Risk Card Overlay */}
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-3 rounded-lg border border-red-500/30 bg-red-950/20 p-3.5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 font-sans">
                  <AlertTriangle className="h-4 w-4" /> Predatory Clause Flagged
                </span>
                <span className="text-[10px] uppercase font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                  High Risk
                </span>
              </div>
              <p className="text-[11px] text-[#F1F3F4] font-sans leading-snug">
                Perpetual IP assignment forces contractor to forfeit future derivative works worldwide.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#88929A] pt-3 border-t border-[#22272E]">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#CBA96B]" />
            <span>Zero Data Retention</span>
          </div>
          <div className="text-[#E0C58A] font-semibold">
            98% Confidence Match
          </div>
        </div>
      </motion.div>
    </div>
  );
}
