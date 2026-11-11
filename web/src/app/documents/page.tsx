'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listDocuments } from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle, Plus, ArrowRight } from 'lucide-react';

function DocumentSkeleton() {
  return (
    <div className="rounded-xl border border-[#22272E] bg-[#111417] p-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-lg bg-[#171A1E]" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/5 rounded bg-[#171A1E]" />
          <div className="h-3 w-28 rounded bg-[#171A1E]" />
        </div>
      </div>
      <div className="h-8 w-24 rounded-lg bg-[#171A1E]" />
    </div>
  );
}

export default function DocumentsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: docs, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
    enabled: mounted,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = data?.some((d) => d.status === 'processing' || d.status === 'uploaded');
      return hasProcessing ? 5000 : false;
    },
  });

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F1F3F4]">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#F1F3F4]">My Documents</h1>
            <p className="text-xs text-[#88929A] mt-1">Manage and access your legal risk reports</p>
          </div>
          <Link href="/upload">
            <Button className="gold-button text-xs uppercase tracking-wider font-bold cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> New analysis
            </Button>
          </Link>
        </div>

        {/* Skeleton while loading */}
        {(!mounted || isLoading) && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <DocumentSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {mounted && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 flex items-center gap-3 text-red-300 text-xs font-medium">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>Failed to load documents. Please sign in and try again.</span>
          </div>
        )}

        {/* Empty state */}
        {mounted && !isLoading && !error && docs && docs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#22272E] bg-[#111417] py-20 px-6 text-center shadow-xl">
            <FileText className="mx-auto h-12 w-12 text-[#88929A]/40 mb-4" />
            <p className="text-[#F1F3F4] font-bold text-base mb-1">No documents analyzed yet</p>
            <p className="text-xs text-[#88929A] max-w-sm mx-auto mb-6">Upload your first contract to get an instant safety score and redline analysis.</p>
            <Link href="/upload">
              <Button className="gold-button text-xs font-bold uppercase tracking-wider cursor-pointer">
                Upload your first contract <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Document list */}
        {mounted && !isLoading && docs && docs.length > 0 && (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.documentId} className="rounded-xl border border-[#22272E] bg-[#111417] p-4 flex items-center justify-between gap-4 hover:border-[#CBA96B]/40 transition-colors shadow-lg">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-[#171A1E] border border-[#22272E] flex items-center justify-center text-[#CBA96B]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F1F3F4] text-sm truncate max-w-md" title={doc.filename}>
                      {doc.filename}
                    </p>
                    <p className="text-xs text-[#88929A] mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      {doc.report ? ` · Safety Score: ${doc.report.safetyScore}/100` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                    doc.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    doc.status === 'processing' ? 'bg-[#CBA96B]/15 text-[#E0C58A] border-[#CBA96B]/30' :
                    doc.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-[#171A1E] text-[#88929A] border-[#22272E]'
                  }`}>
                    {doc.status}
                  </span>
                  {(doc.status === 'processing' || doc.status === 'uploaded') && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#CBA96B]" />
                  )}
                  {doc.status === 'complete' && (
                    <Link href={`/documents/${doc.documentId}`}>
                      <Button size="sm" variant="outline" className="border-[#22272E] bg-[#171A1E] text-[#F1F3F4] hover:bg-[#22272E] cursor-pointer text-xs">
                        View report →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
