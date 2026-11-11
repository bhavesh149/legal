'use client';

import { motion } from 'framer-motion';
import { Lock, Target, Shield, Key } from 'lucide-react';

export function SecuritySection() {
  const pillars = [
    {
      title: 'Local PII Anonymization',
      desc: 'Names, addresses, dates & dollar amounts are scrubbed into generic tokens before hitting AI models.',
      icon: <Lock className="h-6 w-6 text-[#CBA96B]" />,
    },
    {
      title: 'Zero Data Retention (ZDR)',
      desc: 'Our commercial enterprise API endpoints guarantee your contracts are never saved or used for AI training.',
      icon: <Shield className="h-6 w-6 text-[#CBA96B]" />,
    },
    {
      title: 'Exact Source Span Grounding',
      desc: 'Every warning is grounded in verbatim character offsets, allowing you to highlight exact sentences in the PDF.',
      icon: <Target className="h-6 w-6 text-[#CBA96B]" />,
    },
    {
      title: 'Controlled Access & JWT Auth',
      desc: 'Isolated backend architecture ensures user documents are accessible strictly by authenticated owners.',
      icon: <Key className="h-6 w-6 text-[#CBA96B]" />,
    },
  ];

  return (
    <section id="security" className="py-24 bg-[#111417] relative border-t border-[#22272E]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            Enterprise Privacy Architecture
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            Your contracts are <br />
            <span className="font-serif italic gold-gradient-text font-normal">private by design.</span>
          </h2>
          <p className="text-[#88929A] text-base">
            We position ourselves as the anti-public chatbot. Built from the ground up to protect high-net-worth deal sizes and confidential data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pillars.map((p, idx) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="rounded-2xl border border-[#22272E] bg-[#0B0D0F] p-8 hover:border-[#CBA96B]/40 transition-colors flex items-start gap-5 shadow-xl"
            >
              <div className="p-3 rounded-xl bg-[#171A1E] border border-[#22272E] shrink-0">
                {p.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F1F3F4] mb-2">{p.title}</h3>
                <p className="text-[#88929A] text-sm leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
