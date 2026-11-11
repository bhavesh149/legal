'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Shield, LogOut } from 'lucide-react';

export function Navbar() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#22272E] bg-[#0B0D0F]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/upload" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171A1E] border border-[#CBA96B]/30 text-[#CBA96B] font-bold shadow-md">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#F1F3F4] flex items-center gap-1.5">
            LegalAgent <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#171A1E] text-[#CBA96B] border border-[#CBA96B]/30">Vault</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/upload">
            <Button variant="ghost" size="sm" className="text-[#88929A] hover:text-[#F1F3F4] hover:bg-[#171A1E] cursor-pointer text-xs font-semibold">
              Upload PDF
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="text-[#88929A] hover:text-[#F1F3F4] hover:bg-[#171A1E] cursor-pointer text-xs font-semibold">
              My Documents
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="border-[#22272E] bg-[#111417] text-[#F1F3F4] hover:bg-[#171A1E] cursor-pointer text-xs font-semibold">
            <LogOut className="h-3.5 w-3.5 mr-1.5 text-[#CBA96B]" /> Sign out
          </Button>
        </div>
      </div>
    </nav>
  );
}
