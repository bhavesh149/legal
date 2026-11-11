"""S3-compatible object storage adapter.

One code path for both environments: MinIO locally, real AWS S3 in production.
The only difference is configuration (`S3_ENDPOINT_URL` set vs. unset, path-style
addressing) -- never a different client or branching logic.
"""

import asyncio
from functools import cached_property

import boto3
from botocore.client import Config as BotoConfig

from legal_ai.config import Settings


class ObjectStore:
    def __init__(self, settings: Settings):
        self._settings = settings

    @cached_property
    def _client(self):
        boto_config = BotoConfig(
            s3={"addressing_style": "path" if self._settings.s3_use_path_style else "auto"}
        )
        return boto3.client(
            "s3",
            endpoint_url=self._settings.s3_endpoint_url or None,
            region_name=self._settings.s3_region,
            aws_access_key_id=self._settings.s3_access_key_id,
            aws_secret_access_key=self._settings.s3_secret_access_key,
            config=boto_config,
        )

    async def ensure_bucket(self) -> None:
        def _ensure() -> None:
            try:
                self._client.head_bucket(Bucket=self._settings.s3_bucket)
            except Exception:
                self._client.create_bucket(Bucket=self._settings.s3_bucket)

        await asyncio.to_thread(_ensure)

    async def upload_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        await asyncio.to_thread(
            self._client.put_object,
            Bucket=self._settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    async def download_bytes(self, key: str) -> bytes:
        response = await asyncio.to_thread(
            self._client.get_object, Bucket=self._settings.s3_bucket, Key=key
        )
        return response["Body"].read()

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self._client.delete_object, Bucket=self._settings.s3_bucket, Key=key)

    async def presigned_get_url(self, key: str, expires_in: int = 3600) -> str:
        return await asyncio.to_thread(
            self._client.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._settings.s3_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
