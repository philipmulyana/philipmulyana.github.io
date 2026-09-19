import glob
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://philipmulyana.com"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
STUB_MARKERS = ('http-equiv="refresh"', "location.replace")


class SeoSignalsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        values = {name.lower(): value for name, value in attrs if value is not None}
        if tag.lower() == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href")
        if tag.lower() == "meta" and values.get("name", "").lower() == "robots":
            directives = {part.strip().lower() for part in values.get("content", "").split(",")}
            self.noindex = "noindex" in directives


def published_html_files():
    patterns = (
        "*.html",
        "blog/*.html",
        "tools/**/*.html",
        "product/**/*.html",
        "links/**/*.html",
        "corporate/**/*.html",
        "privacy-policy/**/*.html",
    )
    paths = set()
    for pattern in patterns:
        paths.update(Path(path) for path in glob.glob(str(ROOT / pattern), recursive=True))
    return sorted(paths)


def expected_indexable_canonicals():
    urls = set()
    for path in published_html_files():
        html = path.read_text(encoding="utf-8")
        if any(marker in html for marker in STUB_MARKERS):
            continue
        parser = SeoSignalsParser()
        parser.feed(html)
        if parser.noindex or not parser.canonical:
            continue
        parsed = urlparse(parser.canonical)
        if parsed.scheme == "https" and parsed.netloc == "philipmulyana.com" and not parsed.query and not parsed.fragment:
            urls.add(parser.canonical)
    return urls


class SeoFoundationContract(unittest.TestCase):
    def test_robots_allows_public_crawling_and_points_to_sitemap(self):
        robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
        self.assertRegex(robots, r"(?im)^User-agent:\s*\*$")
        self.assertRegex(robots, r"(?im)^Allow:\s*/$")
        self.assertIn("Sitemap: https://philipmulyana.com/sitemap.xml", robots)
        self.assertNotRegex(robots, r"(?im)^Disallow:\s*/$")

    def test_sitemap_is_valid_unique_https_canonical_inventory(self):
        sitemap_path = ROOT / "sitemap.xml"
        root = ET.parse(sitemap_path).getroot()
        self.assertEqual(root.tag, "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")

        locations = [(node.text or "").strip() for node in root.findall("sm:url/sm:loc", SITEMAP_NS)]
        self.assertTrue(locations)
        self.assertEqual(len(locations), len(set(locations)))
        self.assertEqual(locations, sorted(locations, key=lambda url: (url != SITE_ORIGIN + "/", url)))

        for location in locations:
            parsed = urlparse(location)
            self.assertEqual(parsed.scheme, "https")
            self.assertEqual(parsed.netloc, "philipmulyana.com")
            self.assertFalse(parsed.query)
            self.assertFalse(parsed.fragment)

        self.assertEqual(set(locations), expected_indexable_canonicals())


if __name__ == "__main__":
    unittest.main()
