import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "product" / "dana-kuliah"
HTML = (PAGE / "index.html").read_text(encoding="utf-8")
CSS = (PAGE / "styles.css").read_text(encoding="utf-8")
JS = (PAGE / "script.js").read_text(encoding="utf-8")
CHECKOUT = "https://philip-mulyana-84218.myr.id/pl/dana-kuliah"
CTA = "Beli Course — Rp149.000"
H1 = "Ketika Anak Sudah Punya Pilihan Kuliah, Jangan Sampai Dana Menjadi Penghalangnya."


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.h1 = []
        self._in_h1 = False
        self.links = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "h1":
            self._in_h1 = True
        if tag == "a":
            self.links.append(attrs)
        if tag == "img":
            self.images.append(attrs)

    def handle_endtag(self, tag):
        if tag == "h1":
            self._in_h1 = False

    def handle_data(self, data):
        if self._in_h1:
            self.h1.append(data)


class DanaKuliahProductionPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = PageParser()
        cls.parser.feed(HTML)

    def test_message_and_offer_are_the_approved_version(self):
        self.assertEqual("".join(self.parser.h1).strip(), H1)
        self.assertIn("Untuk orang tua dengan anak PAUD–SD", HTML)
        self.assertIn("Course online mandiri", HTML)
        self.assertIn("Workbook Rencana Pendidikan Keluarga", HTML)
        self.assertIn("Rp149.000", HTML)
        self.assertIn("Contoh fiktif • bukan testimonial", HTML)

    def test_every_primary_cta_is_literal_and_opens_the_real_checkout(self):
        ctas = [a for a in self.parser.links if "purchase-cta" in a.get("class", "").split()]
        self.assertEqual(len(ctas), 2)
        self.assertTrue(all(a.get("href") == CHECKOUT for a in ctas))
        self.assertEqual(HTML.count(f">{CTA}</a>"), 2)
        self.assertNotIn("preventDefault", JS)

    def test_production_contains_no_staging_or_fake_social_proof(self):
        forbidden = [
            "DRAFT STAGING", "PLACEHOLDER", "DEMO UI", "Preview notifikasi",
            "purchase-notification", "promo-countdown", "data-demo-component",
            "Checkout belum dihubungkan", "staging-dialog",
            "baru saja membeli", "baru saja bergabung"
        ]
        for token in forbidden:
            self.assertNotIn(token.lower(), HTML.lower())
        self.assertNotIn("setTimeout", JS)
        self.assertNotIn("sessionStorage", JS)

    def test_price_access_support_refund_and_next_step_are_clear(self):
        required = [
            "Harga satu kali", "tidak ada biaya berlangganan",
            "selama materi dan platform masih tersedia",
            "Refund dapat diajukan maksimal 7 hari kalender",
            "hello@philipmulyana.com", "checkout Mayar",
            "memilih metode pembayaran", "Kebijakan Privasi",
            "Ketentuan Produk", "Batas edukasi"
        ]
        for token in required:
            self.assertIn(token, HTML)

    def test_soft_launch_metadata_and_tracking_are_present(self):
        self.assertIn('<meta name="robots" content="noindex,nofollow">', HTML)
        self.assertIn('rel="canonical" href="https://philipmulyana.com/product/dana-kuliah/"', HTML)
        self.assertIn('<script src="/js/pixel.js"></script>', HTML)
        self.assertIn("InitiateCheckout", JS)
        self.assertIn("value: 149000", JS)
        self.assertIn("currency: 'IDR'", JS)

    def test_accessibility_basics(self):
        self.assertEqual(len(self.parser.h1), 1)
        self.assertEqual(len(self.parser.ids), len(set(self.parser.ids)))
        for image in self.parser.images:
            self.assertTrue(image.get("alt", "").strip())
            self.assertTrue(image.get("width"))
            self.assertTrue(image.get("height"))
        self.assertIn(":focus-visible", CSS)
        self.assertRegex(CSS, r"\.button\{[^}]*min-height:56px")
        self.assertRegex(CSS, r"@media\(max-width:600px\).*?\.button\{[^}]*min-height:58px")
        self.assertIn("@media(prefers-reduced-motion:reduce)", CSS)

    def test_assets_are_local_optimized_and_present(self):
        sources = re.findall(r'<img[^>]+src="([^"]+)"', HTML)
        self.assertTrue(sources)
        for source in sources:
            self.assertFalse(source.startswith(("http://", "https://")))
            self.assertTrue((PAGE / source).is_file(), source)
        self.assertIn("assets/family-hero.webp", sources)
        self.assertIn("assets/profile-photo.webp", sources)
        self.assertLess((PAGE / "assets/family-hero.webp").stat().st_size, 250_000)
        self.assertLess((PAGE / "assets/profile-photo.webp").stat().st_size, 250_000)
        self.assertTrue((PAGE / "assets/fonts/OFL.txt").is_file())
        self.assertIn("SIL OPEN FONT LICENSE Version 1.1", (PAGE / "assets/fonts/OFL.txt").read_text(encoding="utf-8"))

    def test_color_contrast_for_primary_actions_and_small_accents(self):
        def luminance(hex_color):
            rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
            linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in rgb]
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

        def contrast(first, second):
            high, low = sorted((luminance(first), luminance(second)), reverse=True)
            return (high + 0.05) / (low + 0.05)

        self.assertGreaterEqual(contrast("#c84e36", "#ffffff"), 4.5)
        self.assertGreaterEqual(contrast("#0f806d", "#ffffff"), 4.5)
        self.assertGreaterEqual(contrast("#8a5700", "#fff4cc"), 4.5)
        self.assertGreaterEqual(contrast("#0b747d", "#fde9e4"), 4.5)
        self.assertGreaterEqual(contrast("#5f6d7f", "#eef5f8"), 4.5)
        self.assertIn('<nav class="policy-links" aria-label="Kebijakan dan bantuan">', HTML)

    def test_no_obvious_secret_is_shipped(self):
        combined = "\n".join((HTML, CSS, JS))
        patterns = [
            r"(?i)(api[_-]?key|webhook[_-]?secret|client[_-]?secret)\s*[:=]\s*['\"][^'\"]+",
            r"gh[opusr]_[A-Za-z0-9_]{20,}",
            r"sk-[A-Za-z0-9]{20,}",
        ]
        for pattern in patterns:
            self.assertIsNone(re.search(pattern, combined))


if __name__ == "__main__":
    unittest.main(verbosity=2)
