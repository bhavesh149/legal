'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, FileText, Sparkles } from 'lucide-react';

const MOCK_FINDINGS = [
  {
    id: 'f1',
    title: 'Uncapped Indemnification Obligations',
    category: 'INDEMNIFICATION',
    severity: 'red',
    quoted: 'Contractor agrees to fully indemnify and hold harmless the Company against all third-party claims, attorney fees, and liabilities without monetary limitation.',
    redline: 'Limit aggregate indemnification liability to fees paid under this Agreement during the preceding 12-month period.',
    market: 'Standard commercial practice caps contractor liability at 1x total contract fees paid.',
  },
  {
    id: 'f2',
    title: 'Perpetual & Exclusive IP Assignment',
    category: 'IP_ASSIGNMENT',
    severity: 'amber',
    quoted: 'All intellectual property, code, frameworks, and derivative works created prior to or during engagement shall belong exclusively to Company in perpetuity.',
    redline: 'Assignment limited to final paid deliverables created specifically for Company under this Statement of Work.',
    market: 'Market standard assigns deliverables upon payment, excluding contractor pre-existing IP and tools.',
  },
  {
    id: 'f3',
    title: '2-Year Industry Non-Compete Restriction',
    category: 'NON_COMPETE',
    severity: 'amber',
    quoted: 'Contractor agrees not to provide software engineering services to any entity in the digital media space for 24 months post-termination.',
    redline: 'Replace non-compete with standard non-solicitation of active named client accounts for 6 months.',
    market: 'Independent contractor non-competes are unenforceable in key jurisdictions and atypical for vendor MSAs.',
  },
];

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<'overview' | 'findings'>('findings');
  const [selectedFindingId, setSelectedFindingId] = useState('f1');

  const selectedFinding = MOCK_FINDINGS.find((f) => f.id === selectedFindingId) ?? MOCK_FINDINGS[0];

  return (
    <section className="py-28 bg-[#111417] relative border-t border-[#22272E]">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            Executive Control Center
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4] tracking-tight">
            Comprehensive risk reports <br />
            <span className="font-serif italic gold-gradient-text font-normal">designed for absolute clarity.</span>
          </h2>
          <p className="text-[#88929A] text-base">
            Every analysis presents safety scores, verbatim PDF offsets, suggested redlines, and market benchmarks in a high-density, human-crafted dashboard.
          </p>
        </motion.div>

        {/* Executive Dashboard Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-2xl border border-[#22272E] bg-[#0B0D0F] shadow-2xl overflow-hidden"
        >
          {/* Dashboard Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#22272E] px-6 py-4 bg-[#111417]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F1F3F4] flex items-center gap-2">
                  Master_Services_Agreement_Final.pdf
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Analysis Complete
                  </span>
                </h3>
                <p className="text-[11px] text-[#88929A]">Document ID: doc_981a2f · Analyzed 2 mins ago</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1.5 bg-[#0B0D0F] p-1 rounded-lg border border-[#22272E] text-xs">
              <button
                onClick={() => setActiveTab('findings')}
                className={`px-3.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'findings' ? 'bg-[#171A1E] text-[#CBA96B] border border-[#CBA96B]/30' : 'text-[#88929A] hover:text-[#F1F3F4]'
                }`}
              >
                Clause Redlines
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'overview' ? 'bg-[#171A1E] text-[#CBA96B] border border-[#CBA96B]/30' : 'text-[#88929A] hover:text-[#F1F3F4]'
                }`}
              >
                Executive Summary
              </button>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Gauge & Risk Matrix */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Score Gauge Card */}
                <div className="rounded-xl border border-[#22272E] bg-[#111417] p-6 text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <svg width="130" height="130" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r="52" fill="none" stroke="#22272E" strokeWidth="10" />
                      <circle
                        cx="65" cy="65" r="52"
                        fill="none" stroke="#CBA96B" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 52 * 0.72} ${2 * Math.PI * 52 * 0.28}`}
                        strokeLinecap="round"
                        transform="rotate(-90 65 65)"
                      />
                      <text x="65" y="63" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="800" fill="#F1F3F4">
                        72
                      </text>
                      <text x="65" y="85" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#88929A" fontWeight="600">
                        / 100
                      </text>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#CBA96B]">Moderate Risk Profile</p>
                    <p className="text-xs text-[#88929A] mt-1">14 Clauses Scanned · 3 High Downside Risks</p>
                  </div>
                </div>

                {/* Risk Counter Pills */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3">
                    <p className="text-[10px] font-bold uppercase text-red-400">High Risk</p>
                    <p className="text-xl font-black text-[#F1F3F4] mt-0.5">1</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
                    <p className="text-[10px] font-bold uppercase text-amber-400">Medium</p>
                    <p className="text-xl font-black text-[#F1F3F4] mt-0.5">2</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                    <p className="text-[10px] font-bold uppercase text-emerald-400">Low Risk</p>
                    <p className="text-xl font-black text-[#F1F3F4] mt-0.5">11</p>
                  </div>
                </div>

                {/* Finding Selector List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#88929A]">Flagged Items</p>
                  {MOCK_FINDINGS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        selectedFindingId === f.id
                          ? 'border-[#CBA96B]/50 bg-[#171A1E] text-[#F1F3F4] font-semibold shadow'
                          : 'border-[#22272E] bg-[#111417] text-[#88929A] hover:text-[#F1F3F4] hover:border-[#22272E]'
                      }`}
                    >
                      <span className="truncate max-w-[200px]">{f.title}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#88929A]" />
                    </button>
                  ))}
                </div>

              </div>

              {/* Right Column: Detailed Clause & Redline Inspector */}
              <div className="lg:col-span-8 rounded-xl border border-[#22272E] bg-[#111417] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#22272E] pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#88929A] block mb-0.5">
                      {selectedFinding.category}
                    </span>
                    <h4 className="text-base font-bold text-[#F1F3F4]">{selectedFinding.title}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                    selectedFinding.severity === 'red'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {selectedFinding.severity === 'red' ? 'High Risk' : 'Medium Risk'}
                  </span>
                </div>

                {/* Original Clause Excerpt */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#88929A] uppercase tracking-wide">
                    Verbatim Contract Excerpt
                  </span>
                  <div className="rounded-xl border border-[#22272E] bg-[#0B0D0F] p-4 font-mono text-xs text-[#F1F3F4] leading-relaxed italic">
                    &ldquo;{selectedFinding.quoted}&rdquo;
                  </div>
                </div>

                {/* AI Suggested Redline */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#CBA96B] uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#CBA96B]" /> Suggested Redline
                  </span>
                  <div className="rounded-xl border border-[#22272E] bg-[#171A1E] p-4 font-mono text-xs text-[#F1F3F4] leading-relaxed">
                    {selectedFinding.redline}
                  </div>
                </div>

                {/* Market Benchmark */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Market Standard Benchmark
                  </span>
                  <p className="text-xs text-[#88929A] leading-relaxed">
                    {selectedFinding.market}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
