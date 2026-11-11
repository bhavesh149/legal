'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(authError ?? '');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/upload');
    }
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/upload`,
      },
    });
  };

  return (
    <form onSubmit={handleEmailLogin} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#88929A]">Email address</label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[#171A1E] border-[#22272E] text-[#F1F3F4] placeholder:text-[#88929A]/50 focus:border-[#CBA96B]"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#88929A]">Password</label>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[#171A1E] border-[#22272E] text-[#F1F3F4] placeholder:text-[#88929A]/50 focus:border-[#CBA96B]"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/40 border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full gold-button cursor-pointer uppercase tracking-wider text-xs font-bold" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in&hellip;</> : 'Sign in to vault'}
      </Button>

      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-[#22272E]" />
        <span className="text-[11px] text-[#88929A] font-semibold">OR</span>
        <div className="flex-1 border-t border-[#22272E]" />
      </div>

      <Button type="button" variant="outline" className="w-full border-[#22272E] bg-[#171A1E] text-[#F1F3F4] hover:bg-[#22272E] cursor-pointer" onClick={handleGoogle}>
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-xs text-[#88929A] pt-2">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#CBA96B] hover:underline font-semibold">
          Create account <ArrowRight className="inline h-3 w-3" />
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D0F] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[#22272E] bg-[#111417] p-8 shadow-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B]">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-[#F1F3F4] tracking-tight">LegalAgent</span>
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-[#F1F3F4]">Welcome back</h1>
        <p className="mb-6 text-xs text-[#88929A]">Sign in to access your contract vault</p>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#88929A]" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
