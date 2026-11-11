"""ID and content-hash helpers used for idempotent ingestion and job/document identifiers."""

import hashlib
import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def content_hash(*parts: str) -> str:
    """Stable, deterministic hash used as a Qdrant point ID for idempotent upserts.

    Re-ingesting the same chunk text + metadata produces the same ID, so re-running
    corpus ingestion after a small edit updates that one point instead of duplicating it.
    """
    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()


def hash_to_uuid(hex_digest: str) -> str:
    """Qdrant point IDs must be an unsigned int or a UUID -- derive a stable UUID from a hash."""
    return str(uuid.UUID(hex_digest[:32]))
