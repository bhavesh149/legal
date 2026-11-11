"""Clause-aware chunking.

Legal documents have strong internal structure (numbered sections, ARTICLEs, defined
headings). Splitting on that structure -- instead of a naive fixed-size sliding window --
keeps each chunk semantically coherent (one clause per chunk where possible), which
measurably improves retrieval precision and lets findings/citations point at a whole,
readable clause rather than an arbitrary character window.

The same chunker is used at both corpus-ingestion time and document-analysis time so
chunk shapes are consistent between what's indexed and what's queried.
"""

import re
from dataclasses import dataclass

_SECTION_BOUNDARY_PATTERNS = [
    r"^#{1,4}\s+.+$",  # Markdown headings (pymupdf4llm emits these for bold/large text)
    r"^\s*(?:ARTICLE|Article)\s+[IVXLC\d]+\b.*$",
    r"^\s*(?:SECTION|Section)\s+\d+(?:\.\d+)*\b.*$",
    r"^\s*\d+(?:\.\d+){0,3}[.)]\s+\S.*$",  # "1.", "4.2", "10.1.3)" numbered clauses
    r"^\s*[A-Z][A-Z \-/]{6,}$",  # ALL-CAPS heading lines, e.g. "CONFIDENTIALITY"
]
_BOUNDARY_RE = re.compile("|".join(f"(?:{p})" for p in _SECTION_BOUNDARY_PATTERNS), re.MULTILINE)

DEFAULT_TARGET_CHARS = 1500
DEFAULT_MAX_CHARS = 2800
DEFAULT_MIN_CHARS = 200
DEFAULT_OVERLAP_CHARS = 200


@dataclass
class Chunk:
    text: str
    start: int
    end: int
    index: int


def _find_boundaries(markdown: str) -> list[int]:
    boundaries = {0, len(markdown)}
    for match in _BOUNDARY_RE.finditer(markdown):
        boundaries.add(match.start())
    return sorted(boundaries)


def _sliding_window_split(text: str, base_offset: int) -> list[tuple[str, int, int]]:
    """Fallback splitter for a segment that's too large to be one chunk (e.g. a giant
    unstructured wall of text with no detected headings)."""
    pieces: list[tuple[str, int, int]] = []
    start = 0
    n = len(text)
    if n <= DEFAULT_MAX_CHARS:
        return [(text, base_offset, base_offset + n)]

    while start < n:
        end = min(start + DEFAULT_TARGET_CHARS, n)
        # try to break on a sentence/paragraph boundary near the target end
        window = text[start:end]
        break_at = max(window.rfind("\n\n"), window.rfind(". "))
        if break_at > DEFAULT_MIN_CHARS:
            end = start + break_at + 1
        pieces.append((text[start:end], base_offset + start, base_offset + end))
        if end >= n:
            break
        start = max(end - DEFAULT_OVERLAP_CHARS, start + 1)
    return pieces


def chunk_document(markdown: str) -> list[Chunk]:
    if not markdown.strip():
        return []

    boundaries = _find_boundaries(markdown)
    raw_segments: list[tuple[str, int, int]] = []
    for start, end in zip(boundaries[:-1], boundaries[1:], strict=False):
        segment = markdown[start:end]
        if segment.strip():
            raw_segments.append((segment, start, end))

    if not raw_segments:
        raw_segments = [(markdown, 0, len(markdown))]

    # Merge tiny adjacent segments (e.g. a lone heading line) forward so we don't
    # produce a flood of near-empty chunks; split segments that are too large.
    merged: list[tuple[str, int, int]] = []
    buffer_text, buffer_start, buffer_end = raw_segments[0]
    for text, start, end in raw_segments[1:]:
        if len(buffer_text) < DEFAULT_MIN_CHARS:
            buffer_text += text
            buffer_end = end
        else:
            merged.append((buffer_text, buffer_start, buffer_end))
            buffer_text, buffer_start, buffer_end = text, start, end
    merged.append((buffer_text, buffer_start, buffer_end))

    final: list[tuple[str, int, int]] = []
    for text, start, end in merged:
        if len(text) > DEFAULT_MAX_CHARS:
            final.extend(_sliding_window_split(text, start))
        else:
            final.append((text, start, end))

    return [
        Chunk(text=text.strip(), start=start, end=end, index=i)
        for i, (text, start, end) in enumerate(final)
        if text.strip()
    ]
