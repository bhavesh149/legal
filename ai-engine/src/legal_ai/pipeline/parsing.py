"""Document parsing: PDF/text -> clean Markdown.

Cost-conscious choice per plan: `pymupdf4llm` (free, local, fast) instead of a
per-page SaaS parser. Scanned/image-only PDFs are detected and routed through an
OCR fallback (`ocrmypdf` + Tesseract) before re-parsing.
"""

import asyncio
import tempfile
from dataclasses import dataclass
from pathlib import Path

import pymupdf
import pymupdf4llm
import structlog

from legal_ai.config import Settings

logger = structlog.get_logger(__name__)

# Below this many extracted characters per page, we assume the PDF is scanned/image-only.
_MIN_CHARS_PER_PAGE = 20


@dataclass
class ParsedDocument:
    markdown: str
    page_count: int
    used_ocr: bool
    char_count: int


class UnsupportedDocumentError(Exception):
    pass


def _extract_markdown_sync(pdf_path: Path) -> tuple[str, int]:
    doc = pymupdf.open(pdf_path)
    try:
        page_count = doc.page_count
    finally:
        doc.close()
    markdown = pymupdf4llm.to_markdown(str(pdf_path))
    return markdown, page_count


def _looks_scanned(markdown: str, page_count: int) -> bool:
    if page_count == 0:
        return False
    return len(markdown.strip()) < _MIN_CHARS_PER_PAGE * page_count


def _run_ocr_sync(src_path: Path) -> Path:
    import ocrmypdf

    out_path = src_path.with_suffix(".ocr.pdf")
    ocrmypdf.ocr(
        src_path,
        out_path,
        force_ocr=True,
        deskew=True,
        optimize=1,
        progress_bar=False,
    )
    return out_path


async def parse_pdf_bytes(
    content: bytes, *, filename: str, settings: Settings
) -> ParsedDocument:
    """Parse PDF bytes into Markdown, transparently falling back to OCR when needed.

    Runs the CPU-bound parsing/OCR work in a thread so it never blocks the event loop
    (important: this may run inside the FastAPI process for small sync paths, and
    always inside the ARQ worker for the main analyze job).
    """
    suffix = Path(filename).suffix.lower() or ".pdf"
    if suffix not in {".pdf"}:
        raise UnsupportedDocumentError(
            f"Unsupported file type '{suffix}'. MVP supports PDF only; "
            "DOCX/plain-text support is planned."
        )

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / f"input{suffix}"
        pdf_path.write_bytes(content)

        markdown, page_count = await asyncio.to_thread(_extract_markdown_sync, pdf_path)
        used_ocr = False

        if settings.enable_ocr_fallback and _looks_scanned(markdown, page_count):
            logger.info("parsing_ocr_fallback_triggered", filename=filename, page_count=page_count)
            try:
                ocr_path = await asyncio.to_thread(_run_ocr_sync, pdf_path)
                markdown, page_count = await asyncio.to_thread(_extract_markdown_sync, ocr_path)
                used_ocr = True
            except Exception:
                logger.warning("parsing_ocr_fallback_failed", filename=filename, exc_info=True)

        return ParsedDocument(
            markdown=markdown,
            page_count=page_count,
            used_ocr=used_ocr,
            char_count=len(markdown),
        )
