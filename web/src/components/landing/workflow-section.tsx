'use client';

import { motion } from 'framer-motion';
import { Upload, Lock, Cpu, CheckCircle, Send } from 'lucide-react';

export function WorkflowSection() {
  const steps = [
    {
      num: '01',
      title: 'Upload Contract',
      desc: 'Drop your PDF agreement into our secure vault.',
      icon: <Upload className="h-5 w-5 text-[#CBA96B]" />,
    },
    {
      num: '02',
      title: 'Local PII Scrub',
      desc: 'Personal names, addresses & amounts are anonymized.',
      icon: <Lock className="h-5 w-5 text-[#CBA96B]" />,
    },
    {
      num: '03',
      title: 'Hybrid AI Analysis',
      desc: 'Compared against 1,000+ market standard contracts.',
      icon: <Cpu className="h-5 w-5 text-[#CBA96B]" />,
    },
    {
      num: '04',
      title: 'Plain-English Report',
      desc: 'Safety score, clause findings & character-exact PDF offsets.',
      icon: <CheckCircle className="h-5 w-5 text-[#CBA96B]" />,
    },
    {
      num: '05',
      title: 'Pushback Email',
      desc: 'Generate professional response emails with 1 click.',
      icon: <Send className="h-5 w-5 text-[#CBA96B]" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0B0D0F] relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            Frictionless Product Flow
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            From mystery document to <br />
            <span className="font-serif italic gold-gradient-text font-normal">negotiation-ready in 30 seconds.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {steps.map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="rounded-2xl border border-[#22272E] bg-[#111417] p-5 hover:border-[#CBA96B]/40 transition-colors flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#CBA96B]/50 font-mono">{step.num}</span>
                  <div className="p-2 rounded-lg bg-[#171A1E] border border-[#22272E]">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#F1F3F4] mb-2">{step.title}</h3>
                <p className="text-xs text-[#88929A] leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
