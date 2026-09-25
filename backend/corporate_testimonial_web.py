"""Dependency-free ASGI handler for corporate testimonial submissions."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

from backend.corporate_testimonial_core import (
    SubmissionError,
    to_airtable_fields,
    validate_submission,
)


ALLOWED_ORIGIN = "https://philipmulyana.com"
MAX_BODY_BYTES = 12_000
RATE_LIMIT_PER_HOUR = 5
ALLOWED_REQUEST_HEADERS = "content-type,x-form-started-at,x-submission-id"
SENSITIVE_HEADERS = {
    "origin",
    "content-type",
    "content-length",
    "x-form-started-at",
    "x-submission-id",
}


class CorporateTestimonialASGI:
    """Small ASGI app with explicit origin, streaming, and persistence boundaries."""

    def __init__(
        self,
        *,
        rate_store: Any,
        writer: Callable[[dict[str, Any]], None],
        hmac_key: bytes,
        now: Callable[[], float],
    ) -> None:
        self.rate_store = rate_store
        self.writer = writer
        self.hmac_key = hmac_key
        self.now = now

    @staticmethod
    def _headers(scope: dict[str, Any]) -> tuple[dict[str, str], set[str]]:
        headers: dict[str, str] = {}
        duplicates: set[str] = set()
        for raw_key, raw_value in scope.get("headers", []):
            key = raw_key.decode("latin-1").lower()
            if key in headers:
                duplicates.add(key)
            headers[key] = raw_value.decode("latin-1")
        return headers, duplicates

    @staticmethod
    def _cors_headers(origin: str | None) -> list[tuple[bytes, bytes]]:
        headers = [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"cache-control", b"no-store"),
        ]
        if origin == ALLOWED_ORIGIN:
            headers.extend(
                [
                    (b"access-control-allow-origin", ALLOWED_ORIGIN.encode()),
                    (b"access-control-allow-methods", b"POST, OPTIONS"),
                    (b"access-control-allow-headers", ALLOWED_REQUEST_HEADERS.encode()),
                    (b"access-control-max-age", b"600"),
                    (b"vary", b"Origin"),
                ]
            )
        return headers

    async def _respond(
        self,
        send: Callable[..., Any],
        status: int,
        payload: dict[str, Any] | None,
        origin: str | None,
    ) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": self._cors_headers(origin),
            }
        )
        body = b"" if payload is None else json.dumps(payload, separators=(",", ":")).encode()
        await send({"type": "http.response.body", "body": body})

    def _keyed_digest(self, value: str) -> str:
        return hmac.new(self.hmac_key, value.encode(), hashlib.sha256).hexdigest()

    async def _claim_rate_slot(self, client_host: str, now_seconds: int) -> bool:
        hour = now_seconds // 3600
        prefix = self._keyed_digest(f"rate:{client_host}:{hour}")
        for slot in range(RATE_LIMIT_PER_HOUR):
            claimed = await self.rate_store.put.aio(
                f"rate:{prefix}:{slot}", now_seconds, skip_if_exists=True
            )
            if claimed:
                return True
        return False

    @staticmethod
    def _valid_submission_id(value: str | None) -> bool:
        if not value:
            return False
        try:
            parsed = uuid.UUID(value)
        except (ValueError, AttributeError):
            return False
        return parsed.version == 4 and str(parsed) == value.lower()

    async def __call__(self, scope, receive, send) -> None:
        if scope.get("type") != "http":
            return
        headers, duplicates = self._headers(scope)
        origin = headers.get("origin")
        method = scope.get("method", "")
        path = scope.get("path", "")

        if duplicates & SENSITIVE_HEADERS:
            await self._respond(
                send, 400, {"ok": False, "error": "Invalid submission"}, origin
            )
            return

        if path != "/submit":
            await self._respond(send, 404, {"ok": False, "error": "Not found"}, origin)
            return
        if method == "OPTIONS":
            if (
                origin != ALLOWED_ORIGIN
                or headers.get("access-control-request-method") != "POST"
            ):
                await self._respond(
                    send, 403, {"ok": False, "error": "Request not allowed"}, origin
                )
                return
            requested = {
                item.strip().lower()
                for item in headers.get("access-control-request-headers", "").split(",")
                if item.strip()
            }
            if not requested.issubset(set(ALLOWED_REQUEST_HEADERS.split(","))):
                await self._respond(
                    send, 403, {"ok": False, "error": "Request not allowed"}, origin
                )
                return
            await self._respond(send, 204, None, origin)
            return
        if method != "POST":
            await self._respond(send, 405, {"ok": False, "error": "Method not allowed"}, origin)
            return
        if origin != ALLOWED_ORIGIN:
            await self._respond(
                send, 403, {"ok": False, "error": "Request not allowed"}, origin
            )
            return

        now_seconds = int(self.now())
        client = scope.get("client")
        client_host = client[0] if client else "unknown"
        try:
            claimed = await self._claim_rate_slot(client_host, now_seconds)
        except Exception:
            await self._respond(
                send,
                503,
                {"ok": False, "error": "Submission temporarily unavailable"},
                origin,
            )
            return
        if not claimed:
            await self._respond(
                send, 429, {"ok": False, "error": "Too many submissions"}, origin
            )
            return

        content_length = headers.get("content-length")
        try:
            if content_length is not None and not 0 <= int(content_length) <= MAX_BODY_BYTES:
                await self._respond(
                    send, 413, {"ok": False, "error": "Submission too large"}, origin
                )
                return
        except ValueError:
            await self._respond(
                send, 400, {"ok": False, "error": "Invalid submission"}, origin
            )
            return

        media_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if media_type != "application/json":
            await self._respond(send, 415, {"ok": False, "error": "JSON required"}, origin)
            return

        raw_body = bytearray()
        while True:
            message = await receive()
            if message.get("type") == "http.disconnect":
                return
            if message.get("type") != "http.request":
                continue
            chunk = message.get("body", b"")
            if len(raw_body) + len(chunk) > MAX_BODY_BYTES:
                await self._respond(
                    send, 413, {"ok": False, "error": "Submission too large"}, origin
                )
                return
            raw_body.extend(chunk)
            if not message.get("more_body", False):
                break

        try:
            data = json.loads(bytes(raw_body))
            started_at = int(headers.get("x-form-started-at", ""))
            submission_id = headers.get("x-submission-id")
            if not self._valid_submission_id(submission_id):
                raise SubmissionError("Invalid submission ID")
            cleaned = validate_submission(
                data, now_ms=now_seconds * 1000, started_at=started_at
            )
            submitted_at = (
                datetime.fromtimestamp(now_seconds, timezone.utc)
                .isoformat(timespec="seconds")
                .replace("+00:00", "Z")
            )
            fields = to_airtable_fields(
                cleaned,
                submitted_at=submitted_at,
                submission_id=submission_id,
            )
        except (TypeError, ValueError, UnicodeDecodeError, SubmissionError):
            await self._respond(
                send, 400, {"ok": False, "error": "Invalid submission"}, origin
            )
            return

        try:
            await asyncio.to_thread(self.writer, fields)
        except Exception:
            await self._respond(
                send,
                502,
                {"ok": False, "error": "Submission could not be stored"},
                origin,
            )
            return
        await self._respond(send, 201, {"ok": True}, origin)
