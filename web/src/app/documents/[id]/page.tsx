'use client';

export const dynamic = 'force-dynamic';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDocumentStatus } from '@/lib/api';
import type { ClauseFinding } from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, MessageSquare, ShieldCheck, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-7 w-2/3 rounded bg-[#171A1E]" />
          <div className="h-4 w-40 rounded bg-[#171A1E]" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-[#171A1E]" />
      </div>
      <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 space-y-4">
        <div className="h-28 w-full rounded-xl bg-[#171A1E]" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[#22272E] bg-[#111417] p-6 space-y-3">
          <div className="h-5 w-48 rounded bg-[#171A1E]" />
          <div className="h-4 w-full rounded bg-[#171A1E]" />
        </div>
      ))}
    </div>
  );
}

function SafetyGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#CBA96B' : '#ef4444';
  const pct = score / 100;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#22272E" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r}
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="70" y="68" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="800" fill="#F1F3F4">
          {score}
        </text>
        <text x="70" y="90" textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#88929A">
          / 100
        </text>
      </svg>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {score >= 70 ? 'Low risk' : score >= 40 ? 'Moderate risk' : 'High risk'}
      </p>
    </div>
  );
}

function FindingCard({ finding }: { finding: ClauseFinding }) {
  const isRed = finding.severity === 'red';
  const isYellow = finding.severity === 'yellow';

  return (
    <div className={`rounded-2xl border bg-[#111417] p-6 text-[#F1F3F4] space-y-4 shadow-xl ${
      isRed ? 'border-red-500/30 border-l-4 border-l-red-500' :
      isYellow ? 'border-amber-500/30 border-l-4 border-l-amber-500' :
      'border-[#22272E] border-l-4 border-l-emerald-500'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#F1F3F4]">{finding.title}</h3>
          <p className="text-xs text-[#88929A] font-mono mt-0.5">{finding.category}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
          isRed ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          isYellow ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {finding.severity} risk
        </span>
      </div>

      <p className="text-sm text-[#F1F3F4] leading-relaxed">{finding.explanation}</p>

      {finding.quoted_text && (
        <div className="rounded-xl border border-[#22272E] bg-[#0B0D0F] p-3.5 font-mono text-xs text-[#F1F3F4] leading-relaxed italic">
          &ldquo;{finding.quoted_text}&rdquo;
        </div>
      )}

      {finding.suggested_redline && (
        <div className="rounded-xl bg-[#171A1E] border border-[#22272E] p-3.5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#CBA96B] flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Suggested Redline
          </p>
          <p className="text-xs text-[#F1F3F4] leading-relaxed font-mono">{finding.suggested_redline}</p>
        </div>
      )}

      {finding.market_comparison && (
        <div className="rounded-xl bg-[#171A1E] border border-[#22272E] p-3.5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#88929A]">Market Standard Comparison</p>
          <p className="text-xs text-[#88929A] leading-relaxed">{finding.market_comparison}</p>
        </div>
      )}
    </div>
  );
}

export default function DocumentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['document-status', id],
    queryFn: () => getDocumentStatus(id),
    enabled: mounted,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === 'processing' || s === 'uploaded') return 3000;
      if (s === 'complete' && !query.state.data?.report) return 4000;
      return false;
    },
    retry: 3,
  });

  const isProcessing = !data || data.status === 'processing' || data.status === 'uploaded';
  const isMissingReport = data?.status === 'complete' && !data.report;

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F1F3F4]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1.5 text-xs text-[#88929A] hover:text-[#F1F3F4] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to documents
        </button>

        {(isLoading || (mounted && isProcessing)) && (
          <div>
            {(isLoading || !data) ? (
              <ReportSkeleton />
            ) : (
              <div className="text-center py-24 space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[#22272E]" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#CBA96B] border-t-transparent animate-spin" />
                </div>
                <p className="text-[#F1F3F4] font-bold text-lg">Analyzing your contract&hellip;</p>
                <p className="text-xs text-[#88929A]">Comparing clauses against 1,000+ market standards.</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <div>
              <p className="font-bold text-[#F1F3F4]">Failed to load report</p>
              <p className="text-xs text-[#88929A] mt-1">
                {error instanceof Error ? error.message : 'Unexpected error'}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="border-[#22272E] text-[#F1F3F4] cursor-pointer">
                <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              <Link href="/documents"><Button variant="ghost" className="text-[#88929A] cursor-pointer">My Documents</Button></Link>
            </div>
          </div>
        )}

        {!error && data?.status === 'failed' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <div>
              <p className="font-bold text-[#F1F3F4]">Analysis failed</p>
              <p className="text-xs text-[#88929A] mt-1">The AI engine could not process this document.</p>
            </div>
            <Link href="/upload">
              <Button className="gold-button cursor-pointer text-xs font-bold uppercase tracking-wider">Upload a new document</Button>
            </Link>
          </div>
        )}

        {!error && isMissingReport && (
          <div className="text-center py-24 space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#22272E]" />
              <div className="absolute inset-0 rounded-full border-4 border-[#CBA96B] border-t-transparent animate-spin" />
            </div>
            <p className="text-[#F1F3F4] font-bold text-lg">Finalizing report&hellip;</p>
            <p className="text-xs text-[#88929A]">Saving findings to your private vault.</p>
          </div>
        )}

        {!error && data?.status === 'complete' && data.report && (
          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#F1F3F4] break-all">{data.filename}</h1>
                <p className="text-xs text-[#88929A] mt-1">
                  Analyzed {new Date(data.report.createdAt).toLocaleString()}
                </p>
              </div>
              <Link href={`/documents/${id}/chat`}>
                <Button className="gold-button shrink-0 cursor-pointer text-xs font-bold uppercase tracking-wider">
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Chat with doc
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <SafetyGauge score={data.report.safetyScore} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#CBA96B]" />
                    <span className="text-xs font-bold text-[#F1F3F4] uppercase tracking-wider">Executive summary</span>
                  </div>
                  <p className="text-sm text-[#F1F3F4] leading-relaxed">{data.report.summary}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-[#F1F3F4] flex items-center justify-between">
                <span>Findings ({data.report.findings.length})</span>
              </h2>
              <div className="space-y-4">
                {(data.report.findings as ClauseFinding[])
                  .sort((a, b) => {
                    const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
                    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1);
                  })
                  .map((f, i) => <FindingCard key={i} finding={f} />)}
              </div>
            </div>

            <p className="text-[11px] text-[#88929A] border-t border-[#22272E] pt-4 leading-relaxed">
              {data.report.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
