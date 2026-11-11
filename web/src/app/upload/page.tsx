'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { analyzeDocument } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Upload, FileText, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Rental Agreement', 'Employment Contract', 'NDA', 'Service Agreement', 'Other'];
const PRIORITIES = ['Termination clauses', 'Liability caps', 'IP ownership', 'Payment terms', 'Non-compete', 'Indemnification'];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const togglePriority = (p: string) => {
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await analyzeDocument(
        file,
        { role: role || undefined, risk_tolerance: riskTolerance, priorities },
        category || undefined,
      );
      router.push(`/documents/${result.document_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F1F3F4]">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-extrabold text-[#F1F3F4]">Analyze a contract</h1>
        <p className="mb-8 text-sm text-[#88929A]">Upload a PDF and configure your risk profile for a personalized review.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File drop zone */}
          <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 shadow-xl">
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
                  <FileText className="h-10 w-10 text-[#CBA96B] mb-3" />
                  <p className="font-semibold text-[#F1F3F4]">{file.name}</p>
                  <p className="text-xs text-[#88929A] mt-1">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-[#88929A] mb-3" />
                  <p className="font-semibold text-[#F1F3F4] text-sm">
                    {isDragActive ? 'Drop your PDF here' : 'Drag & drop a PDF, or click to browse'}
                  </p>
                  <p className="text-xs text-[#88929A] mt-1">PDF only · max 20 MB</p>
                </>
              )}
            </div>
          </div>

          {/* Risk profile */}
          <div className="rounded-2xl border border-[#22272E] bg-[#111417] p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#F1F3F4]">Risk profile</h2>
              <p className="text-xs text-[#88929A]">Help the AI tailor its analysis to your situation.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#88929A]">Your role (optional)</label>
              <input
                type="text"
                placeholder="e.g. Tenant, Employee, Contractor"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-[#22272E] bg-[#171A1E] px-3.5 py-2 text-sm text-[#F1F3F4] focus:outline-none focus:border-[#CBA96B] placeholder:text-[#88929A]/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#88929A]">Contract type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#22272E] bg-[#171A1E] px-3.5 py-2 text-sm text-[#F1F3F4] focus:outline-none focus:border-[#CBA96B] cursor-pointer"
              >
                <option value="">Auto-detect</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#88929A]">Risk tolerance</label>
              <div className="flex gap-2">
                {(['conservative', 'balanced', 'aggressive'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRiskTolerance(level)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 text-xs capitalize transition-colors font-medium cursor-pointer',
                      riskTolerance === level
                        ? 'border-[#CBA96B]/50 bg-[#171A1E] text-[#CBA96B] font-bold'
                        : 'border-[#22272E] bg-[#0B0D0F] text-[#88929A] hover:text-[#F1F3F4]',
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#88929A]">Priority areas (optional)</label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePriority(p)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer',
                      priorities.includes(p)
                        ? 'border-[#CBA96B]/50 bg-[#171A1E] text-[#CBA96B] font-semibold'
                        : 'border-[#22272E] bg-[#0B0D0F] text-[#88929A] hover:text-[#F1F3F4]',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full gold-button cursor-pointer uppercase tracking-wider text-xs font-bold" disabled={loading || !file}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading & analyzing…</>
            ) : (
              <>Analyze contract <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
