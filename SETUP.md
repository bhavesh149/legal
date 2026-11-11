# Full Stack Setup Guide

This guide walks you through running all three components locally:
`ai-engine` (Python/FastAPI) → `server` (NestJS) → `web` (Next.js)

---

## 1. Supabase Setup (one-time, manual)

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. Note down from **Settings → API**:
   - **Project URL** → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **JWT Secret** (Settings → API → JWT Settings) → `SUPABASE_JWT_SECRET`
3. Enable **Email/Password** auth: Authentication → Providers → Email → Enable.
4. Enable **Google OAuth**: Authentication → Providers → Google → Enable, fill in your Google OAuth client ID & secret (create at [console.cloud.google.com](https://console.cloud.google.com)). Set the **Authorized redirect URI** to `https://<your-project>.supabase.co/auth/v1/callback`.

---

## 2. AI Engine (FastAPI)

```bash
cd ai-engine
cp .env.example .env   # fill in GROQ_API_KEY and API_INTERNAL_TOKEN

# Start infra (Redis, Qdrant, MinIO)
docker compose up -d

# Install deps + run
uv sync
uv run uvicorn legal_ai.main:create_app --factory --reload --port 8000
# In a second terminal:
uv run arq legal_ai.worker.arq_worker.WorkerSettings
```

---

## 3. Core Server (NestJS)

### 3a. Start Postgres

```bash
cd server
docker compose up -d
# Postgres runs on port 5433 (not 5432) to avoid conflicts with any local Postgres install.
```

### 3b. Configure env

```bash
cp .env.example .env
# Fill in:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/legal_agent
#   SUPABASE_URL, SUPABASE_JWT_SECRET   (from step 1)
#   AI_ENGINE_BASE_URL=http://localhost:8000
#   AI_ENGINE_INTERNAL_TOKEN   (must match ai-engine/.env API_INTERNAL_TOKEN)
```

### 3c. Run migrations

```bash
# First time only — creates the database schema
npx prisma migrate dev --name init
```

### 3d. Start the server

```bash
npm run start:dev
# Runs on http://localhost:3001
```

---

## 4. Web Frontend (Next.js)

```bash
cd web
cp .env.local.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

npm run dev
# Runs on http://localhost:3000
```

---

## 5. End-to-end flow

| Step | URL | Description |
|------|-----|-------------|
| Landing | http://localhost:3000 | Marketing page with free scan CTA |
| Free scan | http://localhost:3000/scan | Instant safety score, no login |
| Sign up | http://localhost:3000/signup | Email/password or Google |
| Upload | http://localhost:3000/upload | PDF + risk profile form |
| Report | http://localhost:3000/documents/[id] | Safety gauge, findings, redlines |
| Chat | http://localhost:3000/documents/[id]/chat | Streaming Q&A with citations |

---

## Architecture overview

```
Browser (Next.js :3000)
   │ Authorization: Bearer <supabase jwt>
   ▼
NestJS (:3001)
   │ verify JWT via Supabase JWT secret
   │ persist Document/Job/Report to Postgres
   │ Authorization: Bearer <internal token> + X-User-Id
   ▼
FastAPI AI Engine (:8000)
   │ parse PDF, embed chunks → Qdrant
   │ ARQ worker → Groq LLM → RiskReport stored in Redis
   ▼
Groq LLM APIs + Qdrant + MinIO + Redis
```

---

## Available API endpoints (NestJS)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /healthz | — | Health check (Postgres ping) |
| GET | /profile | JWT | Get current user profile |
| PUT | /profile/risk-profile | JWT | Update risk profile |
| POST | /documents/scan | JWT | Quick scan (no persistence) |
| POST | /documents | JWT | Full analysis (returns job_id + document_id) |
| GET | /documents | JWT | List all user documents |
| GET | /documents/:id/status | JWT | Poll-through status (auto-persists on complete) |
| POST | /documents/:id/messages | JWT | SSE chat stream |
| GET | /documents/:id/messages | JWT | Chat history |
| DELETE | /documents/:id/messages | JWT | Clear chat history |
