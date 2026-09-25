import asyncio
import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "backend" / "corporate_testimonial_web.py"


def load_web():
    spec = importlib.util.spec_from_file_location("corporate_testimonial_web", WEB)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load corporate testimonial ASGI module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class AsyncPut:
    def __init__(self, store):
        self.store = store

    async def aio(self, key, value, *, skip_if_exists=False):
        if self.store.fail:
            raise RuntimeError("simulated store failure")
        async with self.store.lock:
            if skip_if_exists and key in self.store.values:
                return False
            self.store.values[key] = value
            return True


class FakeStore:
    def __init__(self, *, fail=False):
        self.values = {}
        self.lock = asyncio.Lock()
        self.fail = fail
        self.put = AsyncPut(self)


class Recorder:
    def __init__(self, *, fail_first=False):
        self.records = []
        self.fail_first = fail_first

    def __call__(self, fields):
        if self.fail_first:
            self.fail_first = False
            raise RuntimeError("simulated persistence failure")
        self.records.append(fields)


class CorporateTestimonialASGIContract(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.web = load_web()

    def setUp(self):
        self.store = FakeStore()
        self.writer = Recorder()
        self.app = self.web.CorporateTestimonialASGI(
            rate_store=self.store,
            writer=self.writer,
            hmac_key=b"test-only-key",
            now=lambda: 1005.0,
        )
        self.payload = {
            "name": "Nadia Putri",
            "job_title": "Learning & Development Manager",
            "company": "Contoh Perusahaan",
            "event_program": "Program Financial Wellbeing",
            "testimonial": "Philip menjelaskan topik dengan jelas dan mudah dipahami oleh peserta.",
        }

    async def call(
        self,
        *,
        payload=None,
        origin="https://philipmulyana.com",
        content_type="application/json",
        submission_id="f4ee6981-8280-4c18-9a2e-83e1ade48b24",
        chunks=None,
        method="POST",
        client="203.0.113.5",
    ):
        body = json.dumps(self.payload if payload is None else payload).encode()
        body_chunks = chunks if chunks is not None else [body]
        headers = [
            (b"origin", origin.encode()),
            (b"content-type", content_type.encode()),
            (b"content-length", str(sum(len(item) for item in body_chunks)).encode()),
            (b"x-form-started-at", b"1000000"),
            (b"x-submission-id", submission_id.encode()),
        ]
        scope = {
            "type": "http",
            "method": method,
            "path": "/submit",
            "headers": headers,
            "client": (client, 443),
        }
        events = [
            {
                "type": "http.request",
                "body": chunk,
                "more_body": index < len(body_chunks) - 1,
            }
            for index, chunk in enumerate(body_chunks)
        ]
        if not events:
            events = [{"type": "http.request", "body": b"", "more_body": False}]
        sent = []

        async def receive():
            return events.pop(0)

        async def send(message):
            sent.append(message)

        await self.app(scope, receive, send)
        start = next(item for item in sent if item["type"] == "http.response.start")
        body_event = next(item for item in sent if item["type"] == "http.response.body")
        response_headers = {key.decode(): value.decode() for key, value in start["headers"]}
        return start["status"], response_headers, json.loads(body_event["body"])

    async def test_success_persists_pending_record_before_returning_201(self):
        status, headers, body = await self.call()
        self.assertEqual(status, 201)
        self.assertEqual(body, {"ok": True})
        self.assertEqual(headers.get("access-control-allow-origin"), "https://philipmulyana.com")
        self.assertEqual(len(self.writer.records), 1)
        record = self.writer.records[0]
        self.assertEqual(record["Status"], "Pending")
        self.assertEqual(record["Submission ID"], "f4ee6981-8280-4c18-9a2e-83e1ade48b24")
        self.assertNotIn("Consent", record)
        self.assertNotIn("email", record)

    async def test_rejects_origin_content_type_and_oversized_stream(self):
        status, headers, _ = await self.call(origin="https://evil.example")
        self.assertEqual(status, 403)
        self.assertNotIn("access-control-allow-origin", headers)

        status, _headers, _ = await self.call(content_type="application/x-www-form-urlencoded")
        self.assertEqual(status, 415)

        oversized = [b"x" * 8_000, b"x" * 4_001]
        status, _headers, _ = await self.call(chunks=oversized)
        self.assertEqual(status, 413)
        self.assertEqual(len(self.store.values), 2, "rate slot must be claimed before body rejection")
        self.assertEqual(self.writer.records, [])

        status, _headers, _ = await self.call(content_type="application/json-malicious")
        self.assertEqual(status, 415)

    async def test_rate_store_failure_returns_generic_503(self):
        self.app = self.web.CorporateTestimonialASGI(
            rate_store=FakeStore(fail=True),
            writer=self.writer,
            hmac_key=b"test-only-key",
            now=lambda: 1005.0,
        )
        status, _headers, body = await self.call()
        self.assertEqual(status, 503)
        self.assertEqual(body, {"ok": False, "error": "Submission temporarily unavailable"})

    async def test_duplicate_sensitive_header_is_rejected(self):
        body = json.dumps(self.payload).encode()
        scope = {
            "type": "http",
            "method": "POST",
            "path": "/submit",
            "headers": [
                (b"origin", b"https://philipmulyana.com"),
                (b"content-type", b"application/json"),
                (b"content-type", b"application/json-malicious"),
                (b"content-length", str(len(body)).encode()),
                (b"x-form-started-at", b"1000000"),
                (b"x-submission-id", b"f4ee6981-8280-4c18-9a2e-83e1ade48b24"),
            ],
            "client": ("203.0.113.5", 443),
        }
        sent = []

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        async def send(message):
            sent.append(message)

        await self.app(scope, receive, send)
        start = next(item for item in sent if item["type"] == "http.response.start")
        self.assertEqual(start["status"], 400)
        self.assertEqual(self.writer.records, [])

    async def test_persistence_failure_is_retryable_with_same_submission_id(self):
        writer = Recorder(fail_first=True)
        self.app = self.web.CorporateTestimonialASGI(
            rate_store=self.store,
            writer=writer,
            hmac_key=b"test-only-key",
            now=lambda: 1005.0,
        )
        first, _headers, first_body = await self.call()
        second, _headers, second_body = await self.call()
        self.assertEqual(first, 502)
        self.assertEqual(first_body, {"ok": False, "error": "Submission could not be stored"})
        self.assertEqual(second, 201)
        self.assertEqual(second_body, {"ok": True})
        self.assertEqual(len(writer.records), 1)

    async def test_concurrent_requests_share_atomic_five_per_hour_limit(self):
        calls = []
        for index in range(6):
            submission_id = f"00000000-0000-4000-8000-{index:012d}"
            calls.append(self.call(submission_id=submission_id))
        responses = await asyncio.gather(*calls)
        statuses = sorted(item[0] for item in responses)
        self.assertEqual(statuses, [201, 201, 201, 201, 201, 429])
        self.assertEqual(len(self.writer.records), 5)

    async def test_preflight_allows_only_the_production_origin(self):
        scope = {
            "type": "http",
            "method": "OPTIONS",
            "path": "/submit",
            "headers": [
                (b"origin", b"https://philipmulyana.com"),
                (b"access-control-request-method", b"POST"),
                (
                    b"access-control-request-headers",
                    b"content-type,x-form-started-at,x-submission-id",
                ),
            ],
            "client": ("203.0.113.5", 443),
        }
        sent = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        await self.app(scope, receive, send)
        start = next(item for item in sent if item["type"] == "http.response.start")
        headers = {key.decode(): value.decode() for key, value in start["headers"]}
        self.assertEqual(start["status"], 204)
        self.assertEqual(headers["access-control-allow-origin"], "https://philipmulyana.com")
        self.assertIn("x-submission-id", headers["access-control-allow-headers"])


if __name__ == "__main__":
    unittest.main()
