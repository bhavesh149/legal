# Private Legal Agent -- AI Engine

Isolated Python microservice: document parsing, RAG-grounded contract risk analysis,
and conversational Q&A. Sits behind the NestJS API gateway; never talks to end users
directly. See `../PROJECT.md` for overall product context.

## Stack

- **Python 3.12**, managed with [`uv`](https://docs.astral.sh/uv/).
- **FastAPI** (API) + **ARQ** on Redis (async job queue for the 10-30s analysis job).
- **Groq** (OpenAI-compatible) for LLM calls, tiered by task (`llama-3.1-8b-instant` for
  cheap utility calls, `openai/gpt-oss-120b` default, `moonshotai/kimi-k2` for long docs).
- **Qdrant** for hybrid (dense + sparse, RRF-fused, reranked) vector search.
- **`pymupdf4llm`** for PDF-to-Markdown, with OCR fallback for scanned documents.
- **S3-compatible object storage**: MinIO locally, AWS S3 in production (same code path).

## Quickstart (local)

```bash
# 1. Install uv (https://docs.astral.sh/uv/getting-started/installation/)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Copy env config and add your Groq API key
cp .env.example .env

# 3. Start local infra (Redis, Qdrant, MinIO)
docker compose up -d redis qdrant minio minio-init

# 4. Install dependencies
uv sync

# 5. Run the API
uv run uvicorn legal_ai.main:app --reload --port 8000

# 6. In another terminal, run the background worker (handles /v1/analyze jobs)
uv run arq legal_ai.worker.arq_worker.WorkerSettings
```

Health check: `curl localhost:8000/healthz` and `curl localhost:8000/readyz`.

Interactive API docs: http://localhost:8000/docs

Every request other than `/healthz`/`/readyz` requires:
- `Authorization: Bearer <API_INTERNAL_TOKEN>` (shared secret with the Node gateway)
- `X-User-Id: <authenticated user id>` (forwarded by the Node gateway after its own auth)

## Optional extras

```bash
uv sync --extra pii   # Presidio + spaCy (PII anonymization; off by default -- see below)
uv run python -m spacy download en_core_web_lg   # required once PII is enabled

uv sync --extra ocr    # ocrmypdf (scanned-document fallback); also requires system
                        # packages: tesseract-ocr, ghostscript, qpdf (brew/apt install)
```

## Feature flags

| Flag | Default | Notes |
|---|---|---|
| `ENABLE_PII_ANONYMIZATION` | `false` | MVP defers the local-anonymization privacy engine. When enabled, PII detected via Presidio is swapped for reversible tokens (`PERSON_1`, ...) before any text reaches Groq; the token map lives only in Redis. |
| `ENABLE_OCR_FALLBACK` | `true` | Scanned/image-only PDFs are OCR'd via `ocrmypdf` + Tesseract before re-parsing. |

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /v1/analyze` | Upload a contract (multipart PDF + risk profile) -> `202 {job_id, document_id}`. Enqueued on ARQ; takes 10-30s. |
| `GET /v1/jobs/{job_id}` | Poll analysis job status/result (`RiskReport` once complete). |
| `POST /v1/scan` | Free "Risk Scanner" PLG flow: fast, score-only teaser, no persistence, no queue. |
| `POST /v1/documents/{document_id}/messages` | Ask a follow-up question about an analyzed document; streamed via SSE, grounded in both the user's own document and the standard-clause corpus. |
| `GET /v1/documents/{document_id}/messages` | Fetch conversation history. |
| `DELETE /v1/documents/{document_id}/messages` | Clear conversation history. |

## Training the standard-clause corpus (step by step)

The `standard_clauses` Qdrant collection is what "is this normal?" / "market
comparison" findings are grounded against. Feeding it is a first-class, repeatable
workflow, not a one-off:

1. **Drop source contracts into category folders** under `data/standards/`:

   ```
   data/standards/
     nda/            # standard NDAs
     msa/            # master service agreements
     safe_note/      # Y-Combinator SAFE notes, etc.
     sponsorship/    # creator/influencer sponsorship agreements
     vendor_agreement/
   ```

   Add PDFs (MVP supports PDF only) of well-vetted, standard/fair contracts -- the
   quality of this corpus directly determines the quality of every "market
   comparison" finding, so curate deliberately (see licensing note below).

2. **Run ingestion** for one category or all of them:

   ```bash
   uv run python -m legal_ai.ingestion.build_corpus --category nda
   uv run python -m legal_ai.ingestion.build_corpus            # all categories
   ```

   Under the hood, each file goes through: parse to Markdown (`pipeline/parsing.py`,
   the same parser used at query time) -> clause-aware chunking
   (`pipeline/chunking.py`, same chunker used at query time, so shapes match) ->
   cheap-model auto-tagging of each chunk's `clause_type` (e.g. `ARBITRATION`,
   `IP_ASSIGNMENT`) -> dense (BGE-small) + sparse (BM25) embedding -> idempotent
   upsert into Qdrant, keyed by a content hash of `(category, filename, chunk text)`.

3. **Re-running is safe.** Fixed a typo in one source file? Just re-run ingestion for
   that category -- only the changed chunk's hash changes, so only that point gets
   updated; nothing is duplicated.

4. **Verify retrieval quality before trusting the corpus:**

   ```bash
   uv run python -m legal_ai.ingestion.build_corpus --verify
   ```

   This fires a handful of canned legal queries (e.g. "perpetual IP assignment") and
   prints the top-3 retrieved chunks per query so you can eyeball whether retrieval
   is returning sensible, on-topic clauses -- do this after every meaningful corpus
   update, not just once.

5. **Version the corpus.** `CORPUS_VERSION` in `.env` is stamped onto every ingested
   chunk's payload. Bump it when you do a significant corpus refresh so you can
   filter/roll back to a known-good snapshot if a bad ingestion run degrades
   retrieval quality (filtering by version is not yet wired into the query path --
   tracked as a follow-up).

**Corpus licensing note:** only ingest contracts you have the right to use for this
purpose (e.g. YC's publicly-published SAFE templates, your own drafted templates, or
properly licensed sources). Do not scrape or ingest a third party's copyrighted
contract templates without permission.

## Concurrency & Groq rate limits

Groq's base/dev-tier rate limits are modest per model (e.g. `openai/gpt-oss-120b`:
30 RPM / 8K TPM at time of writing -- check `console.groq.com` for current limits).
This service self-throttles (see `llm/client.py`) via a per-model semaphore + a
proactive Redis-backed rate check + retry-with-backoff on 429s, and tiers work across
models so cheap utility calls (query condensation, corpus tagging) don't compete with
the main analysis/chat model's budget. **Before onboarding real users, request a
Developer-plan rate limit increase from Groq** -- the self-throttling keeps the
service correct and stable under the base tier, not fast.

## Local vs. production

| Concern | Local | Production |
|---|---|---|
| Object storage | MinIO (`docker-compose.yml`) | AWS S3 (same `boto3` code path; unset `S3_ENDPOINT_URL`) |
| Vector DB | Qdrant (Docker) | Qdrant Cloud or self-hosted Qdrant |
| Queue / cache / conversations | Redis (Docker) | ElastiCache / Upstash / managed Redis |
| Secrets | `.env` | AWS Secrets Manager / SSM Parameter Store |
| LLM | Groq | Groq (same) |

**Note on image tags:** `docker-compose.yml` uses `:latest` for Qdrant/MinIO to avoid
pinned-tag rot in a fast-moving ecosystem for local dev. Pin exact, tested versions
for any shared/production deployment.

## Development

```bash
uv run ruff check .
uv run mypy src
uv run pytest
```

## Known gaps / deferred (see PROJECT.md plan for full list)

- PII anonymization is implemented but off by default; enabling it does not yet
  remap `source_span` offsets back onto the original (non-anonymized) document text.
- No fine-grained per-document access control here -- the Node gateway is the trust
  boundary; this service trusts `X-User-Id` as already-authenticated.
- Eval harness (`eval/`) measures finding precision/recall on a small golden set;
  expand it before relying on this for real user-facing risk decisions.
