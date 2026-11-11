"""Corpus ingestion CLI -- feeds standard/market contracts into the Qdrant
`standard_clauses` collection that powers "is this normal?" comparisons.

See README.md "Training the standard-clause corpus" for the full step-by-step guide.
Quick usage:

    uv run python -m legal_ai.ingestion.build_corpus --category nda
    uv run python -m legal_ai.ingestion.build_corpus            # ingest every category
    uv run python -m legal_ai.ingestion.build_corpus --verify   # sanity-check retrieval

Idempotent by design: each chunk's Qdrant point ID is a deterministic hash of
(category, source filename, chunk text), so re-running ingestion after fixing a typo
in one source file only touches that file's chunks -- nothing is duplicated.
"""

import argparse
import asyncio
from pathlib import Path

from anyio import Path as AsyncPath

from legal_ai.config import get_settings
from legal_ai.pipeline.chunking import chunk_document
from legal_ai.pipeline.parsing import UnsupportedDocumentError, parse_pdf_bytes
from legal_ai.state import AppState, build_app_state, close_app_state
from legal_ai.utils.ids import content_hash, hash_to_uuid
from legal_ai.utils.logging import configure_logging, get_logger

logger = get_logger(__name__)

# ai-engine/src/legal_ai/ingestion/build_corpus.py -> parents[3] == ai-engine/
DATA_ROOT = Path(__file__).resolve().parents[3] / "data" / "standards"
SUPPORTED_EXTENSIONS = {".pdf"}
MIN_CHUNK_CHARS = 50

_DEFAULT_VERIFY_QUERIES = [
    "perpetual intellectual property assignment to the company",
    "mandatory binding arbitration clause",
    "uncapped, unlimited liability indemnification",
    "automatic renewal with short termination notice window",
    "broad non-compete restricting future work",
]


async def _ingest_file(path: Path, category: str, state: AppState, corpus_version: str) -> int:
    content = await AsyncPath(path).read_bytes()
    try:
        parsed = await parse_pdf_bytes(content, filename=path.name, settings=state.settings)
    except UnsupportedDocumentError:
        logger.warning("ingestion_skip_unsupported_file", file=str(path))
        return 0

    chunks = [c for c in chunk_document(parsed.markdown) if len(c.text) >= MIN_CHUNK_CHARS]
    if not chunks:
        logger.warning("ingestion_no_chunks", file=str(path))
        return 0

    ids, texts, payloads = [], [], []
    for chunk in chunks:
        clause_type = await state.groq.tag_clause(chunk.text)
        point_id = hash_to_uuid(content_hash(category, path.name, chunk.text))
        ids.append(point_id)
        texts.append(chunk.text)
        payloads.append(
            {
                "text": chunk.text,
                "start": chunk.start,
                "end": chunk.end,
                "category": category,
                "clause_type": clause_type,
                "source_file": path.name,
                "corpus_version": corpus_version,
            }
        )

    await state.vector_store.upsert(collection="standards", ids=ids, texts=texts, payloads=payloads)
    logger.info("ingested_file", file=path.name, category=category, chunk_count=len(ids))
    return len(ids)


async def _ingest_category(category_dir: Path, category: str, state: AppState, corpus_version: str) -> int:
    total = 0
    files = sorted(
        [Path(p) async for p in AsyncPath(category_dir).iterdir() if p.suffix.lower() in SUPPORTED_EXTENSIONS]
    )
    if not files:
        logger.warning("ingestion_category_empty", category=category, dir=str(category_dir))
        return 0
    for path in files:
        total += await _ingest_file(path, category, state, corpus_version)
    return total


async def _verify(state: AppState) -> None:
    for query in _DEFAULT_VERIFY_QUERIES:
        hits = await state.vector_store.hybrid_search(collection="standards", query_text=query, top_k=3)
        print(f"\nQuery: {query!r}")
        if not hits:
            print("  (no results -- corpus may be empty)")
            continue
        for hit in hits:
            payload = hit.payload
            excerpt = (payload.get("text") or "")[:160].replace("\n", " ")
            print(
                f"  score={hit.score:.3f}  category={payload.get('category')}  "
                f"clause_type={payload.get('clause_type')}  source={payload.get('source_file')}"
            )
            print(f"    {excerpt!r}")


async def _main_async(args: argparse.Namespace) -> None:
    settings = get_settings()
    configure_logging(settings)
    state = await build_app_state(settings)
    try:
        if args.verify:
            await _verify(state)
            return

        if not DATA_ROOT.exists():
            logger.error("data_root_missing", path=str(DATA_ROOT))
            print(f"No corpus source directory found at {DATA_ROOT}. Create it and add category subfolders.")
            return

        categories = (
            [args.category] if args.category else sorted(d.name for d in DATA_ROOT.iterdir() if d.is_dir())
        )
        if not categories:
            print(f"No category folders found under {DATA_ROOT}.")
            return

        total = 0
        for category in categories:
            category_dir = DATA_ROOT / category
            if not category_dir.is_dir():
                logger.warning("category_dir_missing", category=category)
                continue
            total += await _ingest_category(category_dir, category, state, settings.corpus_version)

        print(f"Ingested {total} chunks across {len(categories)} categor(y/ies), corpus_version={settings.corpus_version}.")
        print("Run with --verify to sanity-check retrieval quality before trusting this corpus in production.")
    finally:
        await close_app_state(state)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest standard/market contracts into the Qdrant corpus.")
    parser.add_argument("--category", help="Only ingest this category (folder name under data/standards/)")
    parser.add_argument("--verify", action="store_true", help="Run sample retrieval queries instead of ingesting")
    args = parser.parse_args()
    asyncio.run(_main_async(args))


if __name__ == "__main__":
    main()
