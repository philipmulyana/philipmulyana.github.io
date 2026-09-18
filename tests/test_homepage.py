import unittest
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS_PATH = ROOT / "assets" / "homepage" / "homepage.css"
CSS = CSS_PATH.read_text(encoding="utf-8") if CSS_PATH.exists() else ""

APPROVED_HEADLINE = (
    "Ketika tanggung jawab bertambah, arah keuangan keluarga perlu ikut berubah."
)
APPROVED_SUPPORT = (
    "Mulai dari situasimu sekarang untuk memahami apa yang sudah ada, "
    "apa yang perlu diprioritaskan, dan langkah mana yang paling sesuai."
)


class HomepageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1_text = []
        self._in_h1 = False
        self.h1_count = 0
        self.ids = []
        self.links = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h1":
            self.h1_count += 1
            self._in_h1 = True
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs)
        if tag == "img":
            self.images.append(attrs)

    def handle_endtag(self, tag):
        if tag == "h1":
            self._in_h1 = False

    def handle_data(self, data):
        if self._in_h1:
            self.h1_text.append(data)


class HomepageProductionPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = HomepageParser()
        cls.parser.feed(HTML)

    def test_hero_uses_the_owner_approved_copy(self):
        self.assertEqual(" ".join("".join(self.parser.h1_text).split()), APPROVED_HEADLINE)
        self.assertIn(APPROVED_SUPPORT, " ".join(HTML.split()))
        self.assertNotIn("Coming Soon", HTML)

    def test_homepage_routes_visitors_without_placeholder_links(self):
        required_copy = [
            "Belajar dengan ritmemu sendiri",
            "Bicarakan kebutuhan yang baru muncul",
            "Tinjau perlindungan yang sudah kamu punya",
            "Online Course",
            "Discovery Meeting",
            "Protection Review",
            "Pengalaman panjang, penjelasan tetap sederhana.",
        ]
        for text in required_copy:
            self.assertIn(text, HTML)

        hrefs = [link.get("href", "") for link in self.parser.links]
        self.assertIn("/product/dana-kuliah/", hrefs)
        self.assertIn("#pilih", hrefs)
        self.assertIn("#course", hrefs)
        self.assertIn("#tentang", hrefs)
        self.assertIn("#discovery-meeting", hrefs)
        self.assertIn("#protection-review", hrefs)
        self.assertNotIn("#", hrefs)

        for legacy_destination in ("/consultation.html", "/about.html", "/contact.html"):
            self.assertNotIn(legacy_destination, hrefs)

    def test_homepage_has_no_fake_company_proof_or_wrong_course_title(self):
        forbidden = [
            "Dana Kuliah",
            "Nama Course",
            "Logo perusahaan",
            "PLACEHOLDER",
            "Trusted by",
            "Dipercaya oleh",
        ]
        for token in forbidden:
            self.assertNotIn(token.lower(), HTML.lower())

        self.assertIn('id="company-proof"', HTML)
        self.assertIn('hidden aria-label="Bukti kerja sama perusahaan menunggu data terverifikasi"', HTML)

    def test_semantics_accessibility_and_metadata_are_present(self):
        self.assertIn('<html lang="id">', HTML)
        self.assertEqual(self.parser.h1_count, 1)
        self.assertEqual(len(self.parser.ids), len(set(self.parser.ids)))
        self.assertIn('<link rel="canonical" href="https://philipmulyana.com/">', HTML)
        self.assertIn("Philip Mulyana | Belajar dan Menata Langkah Keuangan Keluarga", HTML)
        self.assertIn(':focus-visible', CSS)
        self.assertIn('@media (prefers-reduced-motion: reduce)', CSS)

    def test_brand_assets_are_local_sized_and_present(self):
        self.assertTrue(self.parser.images)
        sources = []
        for image in self.parser.images:
            source = image.get("src", "")
            sources.append(source)
            self.assertTrue(image.get("alt", "").strip())
            self.assertTrue(image.get("width"))
            self.assertTrue(image.get("height"))
            self.assertFalse(source.startswith(("http://", "https://")))
            self.assertTrue((ROOT / source.lstrip("/")).is_file(), source)

        self.assertIn("/assets/homepage/logo-white.png", sources)
        self.assertIn("/assets/homepage/profile-photo.webp", sources)
        self.assertLess((ROOT / "assets/homepage/profile-photo.webp").stat().st_size, 250_000)
        self.assertIn('@font-face', CSS)
        self.assertIn("font-family: 'Barlow'", CSS)

    def test_portrait_frame_has_no_white_gutters_and_balanced_accent(self):
        self.assertRegex(
            CSS,
            r"\.stage-portrait\{[^}]*background:var\(--black\)[^}]*\}",
        )
        self.assertRegex(CSS, r"\.stage::before\{[^}]*width:8px[^}]*\}")
        self.assertRegex(CSS, r"\.stage-portrait::after\{[^}]*height:8px[^}]*\}")

    def test_tracking_is_preserved_without_duplicate_pixel_loader(self):
        self.assertEqual(HTML.count('/js/pixel.js'), 1)
        self.assertIn('wjulbbpfmx', HTML)

    def test_url_is_scrubbed_before_third_party_trackers_load(self):
        scrub_position = HTML.index('/js/sanitize-attribution.js')
        pixel_position = HTML.index('/js/pixel.js')
        clarity_position = HTML.index('https://www.clarity.ms/tag/')

        self.assertLess(scrub_position, pixel_position)
        self.assertLess(scrub_position, clarity_position)

    def test_no_obvious_secret_is_shipped(self):
        combined = "\n".join((HTML, CSS))
        patterns = [
            r"(?i)(api[_-]?key|webhook[_-]?secret|client[_-]?secret)\s*[:=]\s*['\"][^'\"]+",
            r"gh[opusr]_[A-Za-z0-9_]{20,}",
            r"sk-[A-Za-z0-9]{20,}",
        ]
        for pattern in patterns:
            self.assertIsNone(re.search(pattern, combined))


if __name__ == "__main__":
    unittest.main(verbosity=2)
