import hashlib
import importlib.util
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://philipmulyana.com"
EXCLUDED_PARTS = {".git", ".github", "docs", "tests"}
TRACKER_MARKERS = (
    "pixel.js",
    "deferred-trackers.js",
    "connect.facebook.net",
    "clarity.ms",
    "blog-track.js",
)
SAFE_LEGACY_REDIRECTS = {
    "tool-eduplan.html": "/tools/eduplan/",
}
INTERNAL_ONLY_ARTIFACTS = {
    "education-plan-internal.html",
    "pension-plan-internal.html",
    "commission-structure.html",
    "js/pension.js",
    "js/commission.js",
}
INTERNAL_ONLY_FINGERPRINTS = {
    "3629ecffaed7c0e9fb2cf5737e06e0e41727e1827562a57e164aa8c6aad5d7ea",
    "9c43b34a8165337ed99aed6f36dff6b6e97175fcf9fadb56087b0dfbca57ea61",
    "3b948bebe10ed53b2ef1cc9563c98f89411be4b7cc53ceaa08d31e48c35227b2",
    "2d6c9b39c9399e94e3a685ac1dddb96c8878fc71f3287cac02be0cd76a0c0d8a",
    "09cf89d2fa3068cdecab5311e3ae276521415203c323541da34a0347f4eff7c4",
}
INTERNAL_ONLY_MARKER_GROUPS = (
    ("INTERNAL ADVISOR TOOL.", "Copy JSON for Claude"),
    (
        "INTERNAL RECRUITMENT TOOL.",
        "Struktur Income Agent",
        "Simulasi Komisi &amp; Overriding",
    ),
    ("STORAGE_KEY_PEN", "pension_plan_draft", "LOOKUP_ENDPOINT"),
    ("function computeF()", "function computeR()", "const RATES ="),
)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonicals = []
        self.robots = set()
        self.refresh_targets = []

    def handle_starttag(self, tag, attrs):
        values = {name.lower(): value for name, value in attrs if value is not None}
        if tag.lower() == "a" and values.get("href"):
            self.links.append(values["href"])
        if tag.lower() == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonicals.append(values.get("href", ""))
        if tag.lower() == "meta" and values.get("name", "").lower() == "robots":
            self.robots.update(
                directive.strip().lower()
                for directive in values.get("content", "").split(",")
                if directive.strip()
            )
        if tag.lower() == "meta" and values.get("http-equiv", "").lower() == "refresh":
            match = re.search(r"(?:^|;)\s*url\s*=\s*(.+)\s*$", values.get("content", ""), re.I)
            if match:
                self.refresh_targets.append(match.group(1).strip(" \"'"))


def published_html_files():
    return sorted(
        path
        for path in ROOT.rglob("*.html")
        if not any(part in EXCLUDED_PARTS for part in path.relative_to(ROOT).parts)
    )


def parse_page(path):
    html = path.read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(html)
    return html, parser


def public_route(path):
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return "/"
    if relative.endswith("/index.html"):
        return "/" + relative[: -len("index.html")]
    return "/" + relative


def route_file(path):
    path = urlparse(path).path
    if path == "/":
        return ROOT / "index.html"
    relative = path.lstrip("/")
    candidates = [ROOT / relative]
    if path.endswith("/"):
        candidates.append(ROOT / relative / "index.html")
    else:
        candidates.extend((ROOT / f"{relative}.html", ROOT / relative / "index.html"))
    return next((candidate for candidate in candidates if candidate.is_file()), None)


def redirect_target(path):
    _, parser = parse_page(path)
    if len(parser.refresh_targets) != 1:
        return None
    return parser.refresh_targets[0]


def load_publisher():
    path = ROOT / ".github" / "scripts" / "publish_blogs.py"
    spec = importlib.util.spec_from_file_location("publish_blogs", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load publisher from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InternalToolPublicationContract(unittest.TestCase):
    def test_internal_only_tools_are_not_in_the_public_artifact(self):
        published = {
            path.relative_to(ROOT).as_posix(): path
            for path in ROOT.rglob("*")
            if path.is_file() and not any(
                part in EXCLUDED_PARTS for part in path.relative_to(ROOT).parts
            )
        }
        self.assertEqual(INTERNAL_ONLY_ARTIFACTS & published.keys(), set())

        leaked_fingerprints = []
        leaked_markers = []
        leaked_route_references = []
        blocked_route_names = tuple(
            artifact for artifact in INTERNAL_ONLY_ARTIFACTS if artifact.endswith(".html")
        )
        for relative, path in published.items():
            if path.suffix.lower() not in {
                ".html",
                ".js",
                ".json",
                ".md",
                ".toml",
                ".xml",
                ".yaml",
                ".yml",
            }:
                continue
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() in INTERNAL_ONLY_FINGERPRINTS:
                leaked_fingerprints.append(relative)
            text = raw.decode("utf-8", errors="ignore")
            if any(route_name in text for route_name in blocked_route_names):
                leaked_route_references.append(relative)
            for marker_group in INTERNAL_ONLY_MARKER_GROUPS:
                if all(marker in text for marker in marker_group):
                    leaked_markers.append((relative, marker_group))

        self.assertEqual(leaked_fingerprints, [])
        self.assertEqual(leaked_markers, [])
        self.assertEqual(leaked_route_references, [])


class RedirectIntegrityContract(unittest.TestCase):
    def test_meta_refresh_stubs_are_noindex_canonical_and_tracker_free(self):
        checked = 0
        for path in published_html_files():
            html, parser = parse_page(path)
            if not parser.refresh_targets:
                continue
            checked += 1
            self.assertEqual(len(parser.refresh_targets), 1, path)
            target = parser.refresh_targets[0]
            absolute_target = urljoin(SITE_ORIGIN + public_route(path), target)
            self.assertIn("noindex", parser.robots, path)
            self.assertEqual(parser.canonicals, [absolute_target], path)
            self.assertFalse(
                any(marker in html for marker in TRACKER_MARKERS),
                f"redirect stub must not load trackers: {path}",
            )
            sanitizer = html.find('/js/sanitize-attribution.js')
            redirect_script = html.find('window.location.replace')
            self.assertGreaterEqual(sanitizer, 0, f"missing attribution sanitizer: {path}")
            self.assertGreater(redirect_script, sanitizer, f"sanitizer must run before redirect: {path}")
            self.assertIn('window.__pmAttributionSanitized === true', html, path)
            self.assertIn('window.location.search', html, path)
            self.assertIn('window.location.hash', html, path)
            destination = route_file(urlparse(absolute_target).path)
            self.assertIsNotNone(destination, f"missing redirect target for {path}: {target}")
            self.assertIsNone(redirect_target(destination), f"redirect chain: {path} -> {destination}")
        self.assertGreater(checked, 0)

    def test_approved_legacy_aliases_redirect_directly_to_equivalent_routes(self):
        for relative, expected in SAFE_LEGACY_REDIRECTS.items():
            path = ROOT / relative
            self.assertEqual(redirect_target(path), expected, relative)

    def test_duplicate_legacy_article_keeps_unique_content_with_canonical(self):
        html, parser = parse_page(ROOT / "mk251.html")
        self.assertIsNone(redirect_target(ROOT / "mk251.html"))
        self.assertIn("noindex", parser.robots)
        self.assertEqual(
            parser.canonicals,
            ["https://philipmulyana.com/blog/putusan-mk-251-asuransi-implikasi-polis-kamu.html"],
        )
        self.assertIn("K: Jumlah yang harus Pemegang Polis", html)
        self.assertIn("M: Manfaat Asuransi yang telah dibayarkan", html)

    def test_dynamic_post_router_is_noindex_and_tracker_free(self):
        html, parser = parse_page(ROOT / "post.html")
        self.assertIn("noindex", parser.robots)
        self.assertFalse(any(marker in html for marker in TRACKER_MARKERS))
        capture = html.index("window.__legacyPostSlug")
        sanitizer = html.index('/js/sanitize-attribution.js')
        router = html.index("async function loadPost")
        self.assertLess(capture, sanitizer)
        self.assertLess(sanitizer, router)
        self.assertIn("data/posts.json", html)
        self.assertIn("window.__pmAttributionSanitized === true", html)


class InternalLinkContract(unittest.TestCase):
    def test_internal_links_resolve_and_do_not_point_to_redirect_stubs(self):
        failures = []
        for source in published_html_files():
            _, parser = parse_page(source)
            if parser.refresh_targets:
                continue
            source_url = SITE_ORIGIN + public_route(source)
            for href in parser.links:
                if href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
                    continue
                parsed = urlparse(urljoin(source_url, href))
                if parsed.netloc and parsed.netloc != "philipmulyana.com":
                    continue
                destination = route_file(parsed.path or "/")
                if destination is None:
                    failures.append(f"broken: {source.relative_to(ROOT)} -> {href}")
                    continue
                if redirect_target(destination):
                    failures.append(f"redirect hop: {source.relative_to(ROOT)} -> {href}")
        self.assertEqual(failures, [])


class PublisherLinkContract(unittest.TestCase):
    def test_publisher_normalizes_legacy_tool_links_without_removing_them(self):
        publisher = load_publisher()
        markdown = (
            "Gunakan [kalkulator pendidikan](https://philipmulyana.com/tool-education.html), "
            "[eduplan](/tool-eduplan.html), [proteksi](/tool-proteksi.html), "
            "[pensiun](https://philipmulyana.com/tool-retirement.html), dan "
            "[financial check-up](/financial-checkup.html)."
        )
        normalized = publisher._normalize_internal_links(markdown)
        self.assertIn("[kalkulator pendidikan](/tools/education/)", normalized)
        self.assertIn("[eduplan](/tools/eduplan/)", normalized)
        self.assertIn("[proteksi](/tools/proteksi/)", normalized)
        self.assertIn("[pensiun](/tools/retirement/)", normalized)
        self.assertIn("[financial check-up](/financial-checkup.html)", normalized)
        self.assertNotIn("tool-education.html", normalized)
        self.assertNotIn("tool-eduplan.html", normalized)
        self.assertNotIn("tool-proteksi.html", normalized)
        self.assertNotIn("tool-retirement.html", normalized)

    def test_publisher_does_not_rewrite_external_urls_or_plain_text(self):
        publisher = load_publisher()
        markdown = (
            "[external](https://example.com/tool-retirement.html) "
            "[nested](https://example.com/?next=https://philipmulyana.com/tool-retirement.html) "
            "https://example.com/https://philipmulyana.com/tool-retirement.html "
            "Literal /tool-retirement.html mention "
            "[root](/tool-retirement.html?utm_source=meta#result) "
            '<a href="/tool-education.html#form">education</a>'
        )
        normalized = publisher._normalize_internal_links(markdown)
        self.assertIn("[external](https://example.com/tool-retirement.html)", normalized)
        self.assertIn(
            "[nested](https://example.com/?next=https://philipmulyana.com/tool-retirement.html)",
            normalized,
        )
        self.assertIn(
            "https://example.com/https://philipmulyana.com/tool-retirement.html",
            normalized,
        )
        self.assertIn("Literal /tool-retirement.html mention", normalized)
        self.assertIn("[root](/tools/retirement/?utm_source=meta#result)", normalized)
        self.assertIn('href="/tools/education/#form"', normalized)


if __name__ == "__main__":
    unittest.main(verbosity=2)
