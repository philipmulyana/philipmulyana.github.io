import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADAPTER = ROOT / "backend" / "corporate_testimonial_airtable.py"
SUBMISSION_ID = "f4ee6981-8280-4c18-9a2e-83e1ade48b24"


def load_adapter():
    spec = importlib.util.spec_from_file_location("corporate_testimonial_airtable", ADAPTER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load Airtable adapter")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload = payload
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


class FakeTransport:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def __call__(self, request, timeout):
        self.requests.append((request, timeout))
        return self.responses.pop(0)


class AirtableAdapterContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapter = load_adapter()

    def setUp(self):
        self.fields = {
            "Name": "Nadia Putri",
            "Job Title": "L&D Manager",
            "Company": "Contoh Perusahaan",
            "Event/Program": "Financial Wellbeing",
            "Quote": "Penjelasannya jelas dan mudah dipahami oleh seluruh peserta.",
            "Status": "Pending",
            "Submitted at": "2026-09-25T12:00:00Z",
            "Submission ID": SUBMISSION_ID,
        }

    def test_checks_existing_id_then_patches_atomic_upsert(self):
        transport = FakeTransport(
            [
                FakeResponse({"records": []}),
                FakeResponse({"records": [{"id": "rec123", "fields": self.fields}]}),
            ]
        )
        self.adapter.upsert_testimonial(
            self.fields,
            token="test-token",
            base_id="app-test",
            table_name="Corporate Testimonials",
            transport=transport,
        )
        self.assertEqual(len(transport.requests), 2)
        lookup, lookup_timeout = transport.requests[0]
        upsert, upsert_timeout = transport.requests[1]
        self.assertEqual(lookup.get_method(), "GET")
        self.assertIn("Corporate%20Testimonials", lookup.full_url)
        self.assertIn("filterByFormula=", lookup.full_url)
        self.assertIn(SUBMISSION_ID, lookup.full_url)
        self.assertNotIn("Nadia", lookup.full_url)
        self.assertEqual(upsert.get_method(), "PATCH")
        payload = json.loads(upsert.data)
        self.assertEqual(payload["performUpsert"]["fieldsToMergeOn"], ["Submission ID"])
        self.assertEqual(payload["records"], [{"fields": self.fields}])
        self.assertEqual(set(payload["records"][0]["fields"]), set(self.adapter.EXPECTED_FIELDS))
        self.assertEqual(lookup_timeout, 20)
        self.assertEqual(upsert_timeout, 20)

    def test_existing_submission_is_success_without_mutating_moderated_record(self):
        transport = FakeTransport([FakeResponse({"records": [{"id": "rec-existing"}]})])
        self.adapter.upsert_testimonial(
            self.fields,
            token="test-token",
            base_id="app-test",
            table_name="Corporate Testimonials",
            transport=transport,
        )
        self.assertEqual(len(transport.requests), 1)
        self.assertEqual(transport.requests[0][0].get_method(), "GET")

    def test_rejects_wrong_fields_and_unconfirmed_response(self):
        with self.assertRaises(ValueError):
            self.adapter.upsert_testimonial(
                dict(self.fields, Extra="no"),
                token="test-token",
                base_id="app-test",
                table_name="Corporate Testimonials",
                transport=FakeTransport([]),
            )

        transport = FakeTransport([FakeResponse({"records": []}), FakeResponse({"records": []})])
        with self.assertRaises(RuntimeError):
            self.adapter.upsert_testimonial(
                self.fields,
                token="test-token",
                base_id="app-test",
                table_name="Corporate Testimonials",
                transport=transport,
            )


if __name__ == "__main__":
    unittest.main()
