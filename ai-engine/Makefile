.PHONY: install dev-up dev-down api worker lint typecheck test check ingest verify-corpus eval fmt

install:
	uv sync --extra dev

dev-up:
	docker compose up -d redis qdrant minio minio-init

dev-down:
	docker compose down

api:
	uv run uvicorn legal_ai.main:app --reload --port 8000

worker:
	uv run arq legal_ai.worker.arq_worker.WorkerSettings

lint:
	uv run ruff check .

fmt:
	uv run ruff format .
	uv run ruff check --fix .

typecheck:
	uv run mypy src

test:
	uv run pytest

check: lint typecheck test

ingest:
	uv run python -m legal_ai.ingestion.build_corpus

verify-corpus:
	uv run python -m legal_ai.ingestion.build_corpus --verify

eval:
	uv run python eval/run_eval.py
