'use client';

import { Code, UserCheck, Briefcase, Building2 } from 'lucide-react';

export function TrustStrip() {
  const categories = [
    { icon: <Code className="h-5 w-5 text-[#CBA96B]" />, label: 'Freelance Software Developers' },
    { icon: <UserCheck className="h-5 w-5 text-[#CBA96B]" />, label: 'Digital Creators & Influencers' },
    { icon: <Briefcase className="h-5 w-5 text-[#CBA96B]" />, label: 'Agencies & Consultants' },
    { icon: <Building2 className="h-5 w-5 text-[#CBA96B]" />, label: 'Solo Founders & Startups' },
  ];

  return (
    <section className="border-y border-[#22272E] bg-[#111417] py-10">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A] mb-6">
          Built for professionals who sign high-stakes agreements
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center">
          {categories.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-center gap-3 rounded-xl border border-[#22272E] bg-[#0B0D0F] px-4 py-3 text-[#F1F3F4] text-sm font-medium hover:border-[#CBA96B]/40 transition-colors"
            >
              {c.icon}
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
