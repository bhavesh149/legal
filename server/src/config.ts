export const config = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    // SDK v2: publishable key (replaces anon key)
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    // RS256 JWKS endpoint for JWT verification (new Supabase projects)
    jwksUrl:
      process.env.SUPABASE_JWKS_URL ??
      `${process.env.SUPABASE_URL ?? ''}/auth/v1/.well-known/jwks.json`,
  },
  aiEngine: {
    baseUrl: process.env.AI_ENGINE_BASE_URL ?? 'http://localhost:8000',
    internalToken: process.env.AI_ENGINE_INTERNAL_TOKEN ?? 'change-me-shared-secret',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
});

export type AppConfig = ReturnType<typeof config>;
