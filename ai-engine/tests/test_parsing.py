import pymupdf
import pytest

from legal_ai.config import Settings
from legal_ai.pipeline.parsing import UnsupportedDocumentError, parse_pdf_bytes


def _make_pdf_bytes(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=12)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, enable_ocr_fallback=False)


async def test_parse_pdf_extracts_text(settings):
    pdf_bytes = _make_pdf_bytes("This Agreement governs the relationship between the parties.")
    result = await parse_pdf_bytes(pdf_bytes, filename="contract.pdf", settings=settings)
    assert "Agreement" in result.markdown
    assert result.page_count == 1
    assert result.used_ocr is False
    assert result.char_count > 0


async def test_parse_rejects_unsupported_extension(settings):
    with pytest.raises(UnsupportedDocumentError):
        await parse_pdf_bytes(b"not a real docx", filename="contract.docx", settings=settings)
