from legal_ai.pipeline.chunking import DEFAULT_MAX_CHARS, chunk_document

SAMPLE_CONTRACT = """\
MASTER SERVICE AGREEMENT

This Master Service Agreement is entered into by and between the parties below.

1. Definitions

"Confidential Information" means any non-public information disclosed by either party.

2. Intellectual Property

2.1 All work product created under this Agreement shall be assigned perpetually and \
irrevocably to the Company, including all pre-existing IP of the Contractor.

2.2 The Contractor waives all moral rights in the work product.

ARTICLE III: TERMINATION

Either party may terminate this Agreement upon 90 days written notice. Any amounts \
owed remain payable regardless of termination cause.

CONFIDENTIALITY

The parties agree to keep all terms of this Agreement strictly confidential for a \
period of five (5) years following termination.
"""


def test_chunk_document_empty_returns_no_chunks():
    assert chunk_document("") == []
    assert chunk_document("   \n\n  ") == []


def test_chunk_document_splits_on_structure():
    chunks = chunk_document(SAMPLE_CONTRACT)
    assert len(chunks) > 1
    combined_categories = " ".join(c.text for c in chunks)
    assert "Intellectual Property" in combined_categories
    assert "TERMINATION" in combined_categories


def test_chunk_offsets_map_back_into_source_text():
    chunks = chunk_document(SAMPLE_CONTRACT)
    for chunk in chunks:
        assert SAMPLE_CONTRACT[chunk.start : chunk.end].strip() == chunk.text


def test_chunk_indices_are_sequential():
    chunks = chunk_document(SAMPLE_CONTRACT)
    assert [c.index for c in chunks] == list(range(len(chunks)))


def test_large_unstructured_text_is_split_with_sliding_window():
    # No headings/numbering at all -- must fall back to the sliding-window splitter.
    huge_text = ("This is a sentence about liability and indemnification. " * 500).strip()
    assert len(huge_text) > DEFAULT_MAX_CHARS
    chunks = chunk_document(huge_text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.text) <= DEFAULT_MAX_CHARS + 50  # small slack for boundary search


def test_no_content_is_silently_dropped_between_chunks():
    chunks = chunk_document(SAMPLE_CONTRACT)
    # Every non-whitespace character of the source should appear in some chunk.
    reconstructed = "".join(c.text for c in chunks)
    for word in ["Confidential Information", "perpetually", "90 days", "five (5) years"]:
        assert word in reconstructed
