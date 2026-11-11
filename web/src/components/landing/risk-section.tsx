'use client';

import { motion } from 'framer-motion';
import { AlertCircle, ShieldAlert, FileX } from 'lucide-react';

export function RiskSection() {
  const risks = [
    {
      severity: 'red',
      icon: <AlertCircle className="h-6 w-6 text-red-400" />,
      title: 'Unlimited Liability & Indemnification',
      desc: 'You could unknowingly become personally liable for damages exceeding 10x your total compensation package.',
      tag: '🔴 High Risk',
      border: 'border-[#22272E] bg-[#111417] hover:border-red-500/40',
    },
    {
      severity: 'amber',
      icon: <ShieldAlert className="h-6 w-6 text-amber-400" />,
      title: 'Perpetual & Exclusive IP Assignment',
      desc: 'Clauses that grant clients worldwide, perpetual rights over all code, content, or ideas created before or during the deal.',
      tag: '🟠 Medium Risk',
      border: 'border-[#22272E] bg-[#111417] hover:border-amber-500/40',
    },
    {
      severity: 'yellow',
      icon: <FileX className="h-6 w-6 text-yellow-400" />,
      title: 'Predatory Non-Competes & Non-Solicit',
      desc: 'Excessive geographic and timeframe restrictions that lock you out of working with competitors or taking on new clients.',
      tag: '🟡 Needs Review',
      border: 'border-[#22272E] bg-[#111417] hover:border-yellow-500/40',
    },
  ];

  return (
    <section className="py-24 bg-[#0B0D0F] relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            The Blind Sign Epidemic
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            The dangerous part isn&apos;t reading the contract. <br />
            <span className="font-serif italic gold-gradient-text font-normal">It&apos;s knowing what you missed.</span>
          </h2>
          <p className="text-[#88929A] text-base">
            Most professionals skim contracts and blind-sign, unknowingly accepting massive liabilities hidden inside standard legalese.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {risks.map((r, idx) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`rounded-2xl border ${r.border} p-8 transition-all duration-300 shadow-xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-[#171A1E] border border-[#22272E]">
                  {r.icon}
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#171A1E] border border-[#22272E] text-[#F1F3F4]">
                  {r.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#F1F3F4] mb-3">{r.title}</h3>
              <p className="text-[#88929A] text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
