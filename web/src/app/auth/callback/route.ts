import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase PKCE OAuth callback handler.
 * After Google redirects through Supabase, Supabase redirects here with ?code=...
 * We exchange the code for a session on the server, then redirect the user onward.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Where to send the user after successful sign-in (defaults to /upload)
  const next = searchParams.get('next') ?? '/upload';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Exchange failed — redirect to login with error
    console.error('[auth/callback] Code exchange failed:', error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // No code — likely a direct navigation to this URL
  return NextResponse.redirect(`${origin}/login`);
}
