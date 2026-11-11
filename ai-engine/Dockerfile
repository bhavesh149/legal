# Multi-stage build shared by both the API and the ARQ worker (see `target` below).
# Both processes need the exact same dependency set, so we build one base image
# and only vary the final CMD.

FROM python:3.12-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (better layer caching -- source changes don't bust this layer).
# NOTE: the 'ocr'/'pii' extras (ocrmypdf, presidio+spacy) are NOT installed by default to
# keep the base image small/cheap. To enable them, add `--extra ocr --extra pii` below and
# also `apt-get install tesseract-ocr ghostscript qpdf` above.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY src ./src
COPY README.md ./
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

FROM base AS api
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "legal_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS worker
CMD ["uv", "run", "arq", "legal_ai.worker.arq_worker.WorkerSettings"]
