'use client';

import { Check, X } from 'lucide-react';

export function ComparisonSection() {
  const rows = [
    { feature: 'Enterprise Zero Data Retention (ZDR)', generic: false, legal: true },
    { feature: 'Local PII Anonymization (Names -> [PERSON_1])', generic: false, legal: true },
    { feature: 'Character-Exact Source PDF Highlights', generic: false, legal: true },
    { feature: 'Market-Standard Clause Benchmarking (RAG)', generic: false, legal: true },
    { feature: '1-Click "Good Cop" Pushback Email Generator', generic: false, legal: true },
    { feature: 'Severity-Ranked Risk Score (1-100)', generic: false, legal: true },
  ];

  return (
    <section id="comparison" className="py-24 bg-[#0B0D0F] relative">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            Why Generic AI Isn&apos;t Enough
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            Built specifically for <br />
            <span className="font-serif italic gold-gradient-text font-normal">sensitive legal contracts.</span>
          </h2>
        </div>

        <div className="rounded-2xl border border-[#22272E] bg-[#111417] overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#22272E] bg-[#171A1E]">
                <th className="py-4 px-6 text-[#88929A] font-semibold">Capability</th>
                <th className="py-4 px-6 text-center text-[#88929A] font-semibold w-1/4">Public AI Chatbots</th>
                <th className="py-4 px-6 text-center text-[#CBA96B] font-bold w-1/3 bg-[#CBA96B]/10 border-x border-[#CBA96B]/30">
                  LegalAgent AI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22272E] text-[#F1F3F4]">
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#171A1E]/50 transition-colors">
                  <td className="py-4 px-6 font-medium text-[#F1F3F4]">{r.feature}</td>
                  <td className="py-4 px-6 text-center">
                    {r.generic ? (
                      <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-[#88929A]/50 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-6 text-center bg-[#CBA96B]/5 border-x border-[#CBA96B]/20 font-semibold">
                    {r.legal ? (
                      <Check className="h-5 w-5 text-[#CBA96B] mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-[#88929A]/50 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
