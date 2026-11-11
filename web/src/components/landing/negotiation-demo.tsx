'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';

const CLAUSE_SAMPLES = [
  {
    id: 'ip',
    label: 'IP Rights',
    category: 'IP_ASSIGNMENT',
    quoted: 'The Company shall retain perpetual, irrevocable, worldwide rights to all intellectual property, concepts, and materials created during or prior to the term of this agreement.',
    explanation: 'Market standard for freelance deals is a 1-year limited license or assignment scoped ONLY to paid project deliverables, not prior work.',
    pushback: `Hi Alex!\n\nI am so excited to kick off this project with you! I ran the contract through my legal software just to keep my files organized, and it flagged one standard item on Page 4 regarding perpetual IP rights.\n\nMy software noted market standard for these deals is a license limited to project deliverables rather than in perpetuity. Would you be open to adjusting to this standard wording:\n\n"Client retains exclusive rights to paid deliverables created specifically for this engagement upon full payment."\n\nLet me know if that works, ready to sign today!\n\nBest,\n[Your Name]`,
  },
  {
    id: 'non-compete',
    label: 'Non-Compete',
    category: 'NON_COMPETE',
    quoted: 'Contractor agrees not to engage with, consult for, or provide services to any software company operating in North America for a period of 24 months post-termination.',
    explanation: 'A 2-year North American non-compete for a contractor is predatory and restricts your ability to earn a living in your industry.',
    pushback: `Hi Sarah!\n\nReally looking forward to working together! Quick note — my legal review tool flagged Clause 8 (Non-Compete), noting that a 24-month regional non-compete is atypical for independent contractors.\n\nCould we revise this to a standard non-solicitation of direct clients instead? Something like:\n\n"Contractor agrees not to directly solicit Client's active named accounts for 6 months."\n\nAppreciate your flexibility — ready to get started!`,
  },
  {
    id: 'liability',
    label: 'Liability Cap',
    category: 'LIABILITY_CAP',
    quoted: 'Contractor agrees to fully indemnify and hold harmless the Company against all third-party claims, legal fees, and consequential damages without limitation.',
    explanation: 'Uncapped indemnification exposes you to infinite financial liability. Liability should be capped at total fees paid under the contract.',
    pushback: `Hi Mark!\n\nI’m thrilled to start working on this! I ran the agreement through my contract scanner and it highlighted Section 12 (Indemnification) due to uncapped liability.\n\nStandard commercial practice is to cap liability at fees paid under the agreement. Would you be open to adding:\n\n"Contractor's aggregate liability under this agreement shall not exceed total fees paid."\n\nLet me know and I'll sign the updated version right away!`,
  },
];

export function NegotiationDemo() {
  const [selectedId, setSelectedId] = useState('ip');
  const [copied, setCopied] = useState(false);

  const sample = CLAUSE_SAMPLES.find((s) => s.id === selectedId) ?? CLAUSE_SAMPLES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(sample.pushback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="negotiator" className="py-24 bg-[#111417] relative border-t border-[#22272E]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#171A1E] px-4 py-1 text-xs font-semibold text-[#CBA96B] border border-[#CBA96B]/30">
            <Sparkles className="h-3.5 w-3.5 text-[#CBA96B]" /> Pushback Email Generator
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            Don&apos;t negotiate alone. <br />
            <span className="font-serif italic gold-gradient-text font-normal">Play Good Cop. Let AI be the Bad Cop.</span>
          </h2>
          <p className="text-[#88929A] text-base">
            Preserve relationships by blaming &ldquo;my legal software&rdquo;. Get 1-click email drafts that push back on predatory clauses professionally without making you look difficult.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center gap-2 mb-10">
          {CLAUSE_SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedId === s.id
                  ? 'bg-[#171A1E] text-[#CBA96B] border border-[#CBA96B]/40 shadow'
                  : 'bg-[#0B0D0F] border border-[#22272E] text-[#88929A] hover:text-[#F1F3F4]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Interactive Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Side: Predatory Contract Clause */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#22272E] bg-[#0B0D0F] p-6 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Predatory Clause Flagged
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#171A1E] text-[#F1F3F4] border border-[#22272E]">
                  {sample.category}
                </span>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 font-mono text-xs text-red-200 leading-relaxed mb-4">
                &ldquo;{sample.quoted}&rdquo;
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-[#88929A] uppercase tracking-wide">Why it matters</span>
                <p className="text-[#F1F3F4] leading-relaxed">{sample.explanation}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#22272E] text-xs text-[#88929A] flex items-center justify-between">
              <span>Status: Redline Recommended</span>
              <span className="text-red-400 font-semibold">High downside risk</span>
            </div>
          </div>

          {/* Right Side: Generated Pushback Email */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[#22272E] bg-[#0B0D0F] p-6 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#CBA96B] flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#CBA96B]" /> Pushback Email Draft (Good Cop)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8 border-[#CBA96B]/30 bg-[#171A1E] text-[#CBA96B] hover:bg-[#CBA96B] hover:text-[#0B0D0F] cursor-pointer text-xs font-bold transition-all"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied!' : 'Copy Draft'}
                </Button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={sample.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-[#22272E] bg-[#111417] p-5 font-sans text-xs text-[#F1F3F4] whitespace-pre-line leading-relaxed"
                >
                  {sample.pushback}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 pt-4 border-t border-[#22272E] flex items-center justify-between text-xs text-[#88929A]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                Preserves deal momentum
              </span>
              <span>1-Click Copy or Open in Gmail</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
