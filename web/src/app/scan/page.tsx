'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { scanDocument } from '@/lib/api';
import type { ScanResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, Shield, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FreeScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const r = await scanDocument(file);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.safety_score >= 70 ? '#10b981' : result.safety_score >= 40 ? '#CBA96B' : '#ef4444'
    : '#CBA96B';

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F1F3F4]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 border-b border-[#22272E]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B]">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-[#F1F3F4] tracking-tight">LegalAgent</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-[#88929A] hover:text-[#F1F3F4] cursor-pointer">Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="gold-button cursor-pointer text-xs font-bold uppercase tracking-wider">Sign up free</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-4xl font-extrabold text-[#F1F3F4] text-center mb-3">Free Risk Scanner</h1>
        <p className="text-[#88929A] text-center text-sm mb-10">
          Get an instant safety score for any contract — no account required.
        </p>

        {!result ? (
          <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 shadow-xl space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer transition-colors',
                isDragActive ? 'border-[#CBA96B] bg-[#CBA96B]/10' : 'border-[#22272E] hover:border-[#CBA96B]/40 hover:bg-[#171A1E]',
                file && 'border-emerald-500/50 bg-emerald-950/20',
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  <FileText className="h-10 w-10 text-[#CBA96B] mb-2" />
                  <p className="text-[#F1F3F4] font-semibold text-sm">{file.name}</p>
                  <p className="text-[#88929A] text-xs mt-1">Click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-[#88929A] mb-2" />
                  <p className="text-[#F1F3F4] text-sm">Drop a PDF or click to browse</p>
                </>
              )}
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button
              className="w-full gold-button cursor-pointer text-xs font-bold uppercase tracking-wider"
              size="lg"
              onClick={handleScan}
              disabled={!file || loading}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Scanning…</> : <>Scan contract <ArrowRight className="ml-1.5 h-4 w-4" /></>}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 text-center shadow-xl">
              <div className="mb-2 text-7xl font-extrabold" style={{ color: scoreColor }}>
                {result.safety_score}
              </div>
              <p className="text-[#F1F3F4] text-lg font-bold mb-1">Safety Score / 100</p>
              <p className="text-[#88929A] text-xs px-4 leading-relaxed">{result.summary}</p>
            </div>

            <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 flex items-start gap-3 shadow-xl">
              <ShieldCheck className="h-5 w-5 text-[#CBA96B] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#F1F3F4] font-semibold text-sm mb-1">
                  {result.risk_area_count} risk area{result.risk_area_count !== 1 ? 's' : ''} detected
                </p>
                <p className="text-[#88929A] text-xs leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#CBA96B]/30 bg-[#171A1E] p-6 flex items-start gap-3 shadow-xl">
              <Lock className="h-5 w-5 text-[#CBA96B] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#F1F3F4] font-bold text-sm mb-1">Want the full analysis?</p>
                <p className="text-[#88929A] text-xs mb-3 leading-relaxed">
                  Sign up free to see clause-by-clause redlines, suggested rewrites, and pushback emails.
                </p>
                <Link href="/signup">
                  <Button size="sm" className="gold-button cursor-pointer text-xs font-bold">
                    Get full report →
                  </Button>
                </Link>
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="text-[#88929A] text-xs hover:text-[#F1F3F4] transition-colors mx-auto block cursor-pointer"
            >
              ← Scan another document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
