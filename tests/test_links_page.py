import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "links" / "index.html"
CSS = ROOT / "assets" / "site" / "links.css"


class LinksPageParser(HTMLParser):
    VOID_ELEMENTS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    }

    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.images = []
        self.h1_count = 0
        self._stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs)
        if tag == "img":
            self.images.append(attrs)
        if tag == "h1":
            self.h1_count += 1
        if tag not in self.VOID_ELEMENTS:
            self._stack.append(tag)

    def handle_endtag(self, tag):
        if not self._stack:
            raise AssertionError(f"Unexpected closing tag: {tag}")
        opening = self._stack.pop()
        if opening != tag:
            raise AssertionError(f"Unexpected closing tag {tag}; expected {opening}")


class FirstPartyLinksPageContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not PAGE.exists():
            raise AssertionError("Missing first-party social links page: links/index.html")
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.css = CSS.read_text(encoding="utf-8") if CSS.exists() else ""
        cls.parser = LinksPageParser()
        cls.parser.feed(cls.html)

    def test_route_metadata_and_brand_assets_are_first_party(self):
        self.assertIn('<html lang="id">', self.html)
        self.assertIn('<link rel="canonical" href="https://philipmulyana.com/links/">', self.html)
        self.assertIn('<meta name="robots" content="index, follow">', self.html)
        self.assertIn('<title>Philip Mulyana | Link Resmi</title>', self.html)
        self.assertEqual(self.parser.h1_count, 1)
        self.assertEqual(len(self.parser.ids), len(set(self.parser.ids)))
        self.assertIn('/assets/homepage/logo-white.png', self.html)
        self.assertIn('/assets/homepage/profile-photo.webp', self.html)
        for image in self.parser.images:
            src = image.get("src", "")
            self.assertFalse(src.startswith(("http://", "https://")), src)
            self.assertTrue((ROOT / src.lstrip("/")).is_file(), src)
            self.assertTrue(image.get("width"), src)
            self.assertTrue(image.get("height"), src)
            self.assertTrue(image.get("alt", "").strip(), src)

    def test_link_order_and_destinations_match_verified_public_sources(self):
        stack = re.search(r'<nav\b[^>]*class="link-stack"[^>]*>.*?</nav>', self.html, re.S)
        self.assertIsNotNone(stack)
        assert stack is not None
        actual = re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>.*?<strong\b[^>]*>(.*?)</strong>', stack.group(0), re.S)
        actual = [(href, re.sub(r'<[^>]+>', '', label).strip()) for href, label in actual]
        expected = [
            ("https://calendly.com/philipmulyana/first-call", "Jadwalkan First Call"),
            ("/blog.html", "Artikel Terbaru"),
            ("https://wa.me/6281226604199", "FOR COLLAB"),
            ("https://www.youtube.com/c/philipmulyana?sub_confirmation=1", "Subscribe to My YouTube"),
            ("https://www.tiktok.com/@philipmulyana", "Follow me on TikTok"),
            ("https://www.instagram.com/philipmulyana", "Follow me on Instagram"),
        ]
        self.assertEqual(actual, expected)
        self.assertIn('data-latest-blog', stack.group(0))
        self.assertIn('data-latest-blog-title', stack.group(0))
        self.assertIn('data-latest-blog-meta', stack.group(0))
        self.assertEqual(self.html.count('data-forward-attribution'), 1)
        self.assertIn('href="/"', self.html)

    def test_outdated_and_conflicting_linktree_content_is_not_carried_forward(self):
        forbidden = (
            "linktr.ee",
            "15 years",
            "10 Min WA Call",
            "First call via WA call",
            "6282123391967",
            "Join philipmulyana on Linktree",
            "Podcast",
            "Spotify",
        )
        for token in forbidden:
            self.assertNotIn(token.lower(), self.html.lower())
        self.assertIn("Gratis 10 menit lewat telepon.", self.html)
        self.assertIn("Penjelasan yang membantumu memahami pilihan.", self.html)
        self.assertIn("Business Account", self.html)
        self.assertNotIn('href="#"', self.html)

    def test_privacy_tracker_order_and_no_new_runtime_dependency(self):
        sanitizer = self.html.index('/js/sanitize-attribution.js')
        pixel = self.html.index('/js/pixel.js')
        clarity = self.html.index('clarity.ms/tag')
        self.assertLess(sanitizer, pixel)
        self.assertLess(pixel, clarity)
        self.assertEqual(self.html.count('/js/pixel.js'), 1)
        self.assertIn('/js/site.js', self.html)
        self.assertIn('/js/links.js', self.html)
        for dependency in (
            "cdn.tailwindcss.com", "fonts.googleapis.com", "linktr.ee/",
            "jquery", "bootstrap", "swiper", "slick",
        ):
            self.assertNotIn(dependency, self.html.lower())

    def test_mobile_first_accessible_visual_contract(self):
        self.assertIn('<a class="skip-link" href="#link-list">', self.html)
        self.assertIn('<nav id="link-list" class="link-stack" tabindex="-1"', self.html)
        self.assertIn('<main id="main-content"', self.html)
        self.assertIn('aria-label="Link resmi Philip Mulyana"', self.html)
        self.assertIn(':focus-visible', self.css)
        self.assertIn('@media (prefers-reduced-motion: reduce)', self.css)
        self.assertIn('@media (min-width: 760px)', self.css)
        self.assertIn("font-family:'Barlow'", self.css)
        self.assertIn('.link-item-primary .link-copy small{color:inherit;opacity:.9}', self.css)
        self.assertIn('.link-copy strong,.link-copy small{overflow-wrap:anywhere}', self.css)
        self.assertNotIn("overflow-x:auto", self.css.replace(" ", ""))


if __name__ == "__main__":
    unittest.main(verbosity=2)
