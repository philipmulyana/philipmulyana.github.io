import importlib.util
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "corporate" / "feedback" / "index.html"
CORE = ROOT / "backend" / "corporate_testimonial_core.py"
API = ROOT / "backend" / "corporate_testimonial_api.py"
WEB = ROOT / "backend" / "corporate_testimonial_web.py"


class FormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.controls = []
        self.labels = {}
        self._label_for = None
        self._label_text = []
        self.visible_text = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in {"input", "textarea"}:
            self.controls.append((tag, values))
        if tag == "label":
            self._label_for = values.get("for")
            self._label_text = []

    def handle_endtag(self, tag):
        if tag == "label" and self._label_for:
            self.labels[self._label_for] = " ".join(self._label_text).strip()
            self._label_for = None
            self._label_text = []

    def handle_data(self, data):
        text = " ".join(data.split())
        if text:
            self.visible_text.append(text)
            if self._label_for:
                self._label_text.append(text)


def load_core():
    spec = importlib.util.spec_from_file_location("corporate_testimonial_core", CORE)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load corporate testimonial core")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CorporateFeedbackPageContract(unittest.TestCase):
    def setUp(self):
        self.html = PAGE.read_text(encoding="utf-8")
        self.parser = FormParser()
        self.parser.feed(self.html)

    def test_route_metadata_brand_and_tracking_order(self):
        self.assertIn('<html lang="id">', self.html)
        self.assertIn('<meta name="robots" content="noindex,follow">', self.html)
        self.assertIn(
            '<link rel="canonical" href="https://philipmulyana.com/corporate/feedback/">',
            self.html,
        )
        self.assertIn('/assets/site/site.css', self.html)
        self.assertIn('/assets/site/corporate-feedback.css', self.html)
        self.assertIn('/assets/site/logo-white-320.png', self.html)
        self.assertIn('class="skip-link"', self.html)
        self.assertIn('<main id="main-content"', self.html)
        self.assertLess(
            self.html.index('/js/sanitize-attribution.js'),
            self.html.index('/js/deferred-trackers.js'),
        )
        self.assertIn('<script src="/js/corporate-feedback.js" defer></script>', self.html)
        self.assertIn('window.__PM_PIXEL_NO_AUTOCONFIG__ = true', self.html)
        self.assertLess(
            self.html.index('window.__PM_PIXEL_NO_AUTOCONFIG__ = true'),
            self.html.index('/js/deferred-trackers.js'),
        )

    def test_exactly_five_visible_required_fields_with_approved_labels(self):
        controls = [attrs for _tag, attrs in self.parser.controls if attrs.get("type") != "hidden"]
        self.assertEqual(len(controls), 5)
        self.assertEqual(
            [control.get("name") for control in controls],
            ["name", "job_title", "company", "event_program", "testimonial"],
        )
        self.assertEqual(
            [self.parser.labels.get(control.get("id")) for control in controls],
            [
                "Nama",
                "Jabatan",
                "Nama perusahaan",
                "Acara/program yang diikuti",
                "Isi testimonial",
            ],
        )
        self.assertTrue(all("required" in control for control in controls))
        self.assertEqual(
            [control.get("maxlength") for control in controls],
            ["120", "160", "160", "200", "3000"],
        )

    def test_form_has_accessible_error_and_success_states(self):
        self.assertIn('novalidate', self.html)
        self.assertIn('data-clarity-mask="true"', self.html)
        self.assertRegex(
            self.html,
            r'<form[^>]+method="post"[^>]+action="https://philip-mulyana--corporate-testimonial-api-web\.modal\.run/submit"',
        )
        self.assertIn('id="form-errors"', self.html)
        self.assertIn('role="alert"', self.html)
        self.assertIn('tabindex="-1"', self.html)
        self.assertIn('id="submit-status"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn('id="success-state"', self.html)
        self.assertIn('Terima kasih. Testimonial Anda sudah kami terima.', self.html)
        self.assertIn('Kembali ke halaman Corporate', self.html)

    def test_form_does_not_request_or_claim_unapproved_data(self):
        visible = " ".join(self.parser.visible_text).lower()
        for forbidden in (
            "email",
            "telepon",
            "whatsapp",
            "foto",
            "upload",
            "rating",
            "persetujuan",
            "izin publikasi",
            "consent",
        ):
            self.assertNotIn(forbidden, visible)
        self.assertNotIn('type="file"', self.html)
        self.assertNotIn('type="checkbox"', self.html)
        self.assertNotIn('Nama organisasi', self.html)


class CorporateTestimonialCoreContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.core = load_core()
        cls.valid = {
            "name": "  Nadia Putri ",
            "job_title": " Learning & Development Manager ",
            "company": " Contoh Perusahaan ",
            "event_program": " Program Financial Wellbeing ",
            "testimonial": "  Philip menjelaskan topik dengan jelas dan mudah dipahami oleh peserta.  ",
        }
        cls.started_at = 1_000_000

    def test_normalizes_valid_submission_and_maps_pending_airtable_fields(self):
        cleaned = self.core.validate_submission(
            self.valid, now_ms=1_005_000, started_at=self.started_at
        )
        self.assertEqual(cleaned["name"], "Nadia Putri")
        self.assertEqual(cleaned["company"], "Contoh Perusahaan")
        fields = self.core.to_airtable_fields(
            cleaned,
            submitted_at="2026-09-25T10:30:00Z",
            submission_id="f4ee6981-8280-4c18-9a2e-83e1ade48b24",
        )
        self.assertEqual(
            fields,
            {
                "Name": "Nadia Putri",
                "Job Title": "Learning & Development Manager",
                "Company": "Contoh Perusahaan",
                "Event/Program": "Program Financial Wellbeing",
                "Quote": "Philip menjelaskan topik dengan jelas dan mudah dipahami oleh peserta.",
                "Status": "Pending",
                "Submitted at": "2026-09-25T10:30:00Z",
                "Submission ID": "f4ee6981-8280-4c18-9a2e-83e1ade48b24",
            },
        )
        self.assertNotIn("Approved", fields)
        self.assertNotIn("Consent", fields)
        self.assertNotIn("Rating", fields)

    def test_rejects_missing_extra_too_fast_and_oversized_data(self):
        cases = []
        missing = (dict(self.valid, company="   "), 1_000_000)
        cases.append(missing)
        extra = (dict(self.valid, email="nadia@example.com"), 1_000_000)
        cases.append(extra)
        too_fast = (dict(self.valid), 1_004_500)
        cases.append(too_fast)
        oversized = (dict(self.valid, testimonial="x" * 3001), 1_000_000)
        cases.append(oversized)
        short_quote = (dict(self.valid, testimonial="Terlalu singkat"), 1_000_000)
        cases.append(short_quote)

        for payload, started_at in cases:
            with self.subTest(payload_keys=sorted(payload)):
                with self.assertRaises(self.core.SubmissionError):
                    self.core.validate_submission(
                        payload, now_ms=1_005_000, started_at=started_at
                    )

    def test_rejects_control_characters_and_future_timestamps(self):
        for field, value in (
            ("name", "Nadia\tPutri"),
            ("job_title", "L&D\nManager"),
            ("company", "Contoh\u0085Perusahaan"),
            ("event_program", "Acara\u202eProgram"),
            ("testimonial", "Testimonial dengan\ttab yang tidak boleh diterima."),
        ):
            with self.subTest(field=field, value=value):
                with self.assertRaises(self.core.SubmissionError):
                    self.core.validate_submission(
                        dict(self.valid, **{field: value}),
                        now_ms=1_005_000,
                        started_at=1_000_000,
                    )
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_submission(
                dict(self.valid), now_ms=1_005_000, started_at=1_020_000
            )

    def test_modal_wrapper_is_origin_restricted_and_secret_backed(self):
        source = API.read_text(encoding="utf-8")
        web_source = WEB.read_text(encoding="utf-8")
        self.assertIn('https://philipmulyana.com', web_source)
        self.assertNotIn('Access-Control-Allow-Origin": "*"', web_source)
        self.assertIn('modal.Secret.from_name("corporate-testimonial-airtable")', source)
        self.assertIn('app9FkjFzWkgwqQEE', source)
        self.assertIn('Corporate Testimonials', source)
        self.assertIn('modal.Dict.from_name(', source)
        self.assertIn('create_if_missing=True', source)
        self.assertIn("_verify_airtable_schema()", source)
        self.assertNotIn("pip_install", source)
        self.assertNotRegex(source, r'pat[A-Za-z0-9._-]{20,}')
        self.assertNotIn('result.get("id"', source)
        self.assertNotIn('body.decode', source)

    def test_airtable_schema_contract_rejects_drift(self):
        valid_fields = [
            {"name": "Name", "type": "singleLineText"},
            {"name": "Job Title", "type": "singleLineText"},
            {"name": "Company", "type": "singleLineText"},
            {"name": "Event/Program", "type": "singleLineText"},
            {"name": "Quote", "type": "multilineText"},
            {
                "name": "Status",
                "type": "singleSelect",
                "options": {
                    "choices": [
                        {"name": "Pending"},
                        {"name": "Approved"},
                        {"name": "Rejected"},
                    ]
                },
            },
            {
                "name": "Submitted at",
                "type": "dateTime",
                "options": {
                    "dateFormat": {"name": "iso"},
                    "timeFormat": {"name": "24hour"},
                    "timeZone": "utc",
                },
            },
            {"name": "Submission ID", "type": "singleLineText"},
        ]
        self.core.validate_airtable_schema({"fields": valid_fields})

        wrong_type = {"fields": [dict(field) for field in valid_fields]}
        wrong_type["fields"][2]["type"] = "multilineText"
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_airtable_schema(wrong_type)

        missing_pending = {"fields": [dict(field) for field in valid_fields]}
        missing_pending["fields"][5] = {
            "name": "Status",
            "type": "singleSelect",
            "options": {"choices": [{"name": "Approved"}]},
        }
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_airtable_schema(missing_pending)

        wrong_timestamp = {"fields": [dict(field) for field in valid_fields]}
        wrong_timestamp["fields"][6] = {
            "name": "Submitted at",
            "type": "dateTime",
            "options": {
                "dateFormat": {"name": "local"},
                "timeFormat": {"name": "12hour"},
                "timeZone": "Europe/London",
            },
        }
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_airtable_schema(wrong_timestamp)

        extra_field = {"fields": [dict(field) for field in valid_fields]}
        extra_field["fields"].append(
            {"name": "Unexpected", "type": "singleLineText"}
        )
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_airtable_schema(extra_field)

        extra_status = {"fields": [dict(field) for field in valid_fields]}
        extra_status["fields"][5] = {
            "name": "Status",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Pending"},
                    {"name": "Approved"},
                    {"name": "Rejected"},
                    {"name": "Unreviewed"},
                ]
            },
        }
        with self.assertRaises(self.core.SubmissionError):
            self.core.validate_airtable_schema(extra_status)


if __name__ == "__main__":
    unittest.main()
