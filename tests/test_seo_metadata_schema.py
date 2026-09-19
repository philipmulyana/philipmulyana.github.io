import importlib.util
import json
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://philipmulyana.com"


class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.json_ld = []
        self._json_ld_buffer = None

    def handle_starttag(self, tag, attrs):
        values = {name.lower(): value for name, value in attrs if value is not None}
        if tag.lower() == "meta":
            key = values.get("property") or values.get("name")
            if key:
                self.meta[key.lower()] = values.get("content", "")
        if tag.lower() == "script" and values.get("type", "").lower() == "application/ld+json":
            self._json_ld_buffer = []

    def handle_data(self, data):
        if self._json_ld_buffer is not None:
            self._json_ld_buffer.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "script" and self._json_ld_buffer is not None:
            self.json_ld.append(json.loads("".join(self._json_ld_buffer)))
            self._json_ld_buffer = None


def parse_head(path: Path) -> HeadParser:
    parser = HeadParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def load_publisher():
    spec = importlib.util.spec_from_file_location(
        "publish_blogs", ROOT / ".github/scripts/publish_blogs.py"
    )
    if spec is None or spec.loader is None:
        raise AssertionError("Could not load blog publisher module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def schema_nodes(documents):
    nodes = []
    for document in documents:
        if "@graph" in document:
            nodes.extend(document["@graph"])
        else:
            nodes.append(document)
    return nodes


class PageMetadataContract(unittest.TestCase):
    def test_every_sitemap_page_has_source_backed_twitter_card(self):
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = []
        for node in ET.parse(ROOT / "sitemap.xml").findall(".//sm:loc", namespace):
            if not isinstance(node.text, str):
                self.fail("Sitemap loc must contain a URL")
            urls.append(node.text)
        self.assertEqual(len(urls), 49)

        for url in urls:
            path = urlparse(url).path
            if path == "/":
                page = ROOT / "index.html"
            elif path.endswith("/"):
                page = ROOT / path.lstrip("/") / "index.html"
            else:
                page = ROOT / path.lstrip("/")
            with self.subTest(url=url):
                parser = parse_head(page)
                self.assertEqual(parser.meta.get("twitter:card"), "summary")
                self.assertEqual(parser.meta.get("twitter:title"), parser.meta.get("og:title"))
                self.assertEqual(parser.meta.get("twitter:description"), parser.meta.get("og:description"))

    def test_priority_pages_have_complete_open_graph_metadata(self):
        pages = {
            "blog.html": {
                "og:type": "website",
                "og:locale": "id_ID",
                "og:title": "Blog — Philip Mulyana",
                "og:description": "Artikel edukasi keuangan dan berita terkini dengan analisis untuk kehidupan sehari-hari",
                "og:url": ORIGIN + "/blog.html",
            },
            "tools/index.html": {
                "og:type": "website",
                "og:locale": "id_ID",
                "og:title": "Tools Keuangan: Kalkulator & Assessment | Philip Mulyana",
                "og:description": "Gunakan kalkulator dan assessment keuangan Philip Mulyana untuk mendapat gambaran awal tentang risiko, pensiun, dana kuliah, dan kebutuhan proteksi.",
                "og:url": ORIGIN + "/tools/",
            },
            "about.html": {
                "og:type": "profile",
                "og:locale": "id_ID",
                "og:title": "Tentang Philip Mulyana | Financial Coach & Certified Financial Planner",
                "og:description": "Kenali Philip Mulyana, Financial Coach dan Certified Financial Planner yang membantu menjelaskan keuangan dengan bahasa yang jelas dan mudah dipahami.",
                "og:url": ORIGIN + "/about.html",
            },
        }
        for relative_path, expected in pages.items():
            with self.subTest(page=relative_path):
                parser = parse_head(ROOT / relative_path)
                self.assertEqual(parser.meta.get("description"), expected["og:description"])
                for key, value in expected.items():
                    self.assertEqual(parser.meta.get(key), value)

    def test_homepage_describes_existing_person_and_website_only(self):
        parser = parse_head(ROOT / "index.html")
        nodes = schema_nodes(parser.json_ld)
        by_type = {node.get("@type"): node for node in nodes}
        self.assertEqual(set(by_type), {"Person", "WebSite"})

        person = by_type["Person"]
        self.assertEqual(person["@id"], ORIGIN + "/#person")
        self.assertEqual(person["name"], "Philip Mulyana")
        self.assertEqual(person["url"], ORIGIN + "/about.html")
        self.assertEqual(person["image"], ORIGIN + "/assets/homepage/profile-photo.webp")
        self.assertEqual(person["sameAs"], ["https://instagram.com/philipmulyana"])

        website = by_type["WebSite"]
        self.assertEqual(website["@id"], ORIGIN + "/#website")
        self.assertEqual(website["name"], "Philip Mulyana")
        self.assertEqual(website["url"], ORIGIN + "/")
        self.assertEqual(website["inLanguage"], "id-ID")
        self.assertEqual(website["publisher"], {"@id": ORIGIN + "/#person"})


class BlogMetadataContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.posts = {
            post["slug"]: post
            for post in json.loads((ROOT / "data/posts.json").read_text(encoding="utf-8"))["posts"]
        }

    def test_published_articles_have_source_backed_social_metadata_and_schema(self):
        for slug, post in self.posts.items():
            with self.subTest(slug=slug):
                parser = parse_head(ROOT / "blog" / f"{slug}.html")
                canonical = f"{ORIGIN}/blog/{slug}.html"
                expected_social = {
                    "og:type": "article",
                    "og:locale": "id_ID",
                    "og:title": post["title"],
                    "og:description": post["excerpt"],
                    "og:url": canonical,
                }
                for key, value in expected_social.items():
                    self.assertEqual(parser.meta.get(key), value)

                date = post.get("date", "").strip()
                if date:
                    self.assertEqual(parser.meta.get("article:published_time"), date)
                    nodes = schema_nodes(parser.json_ld)
                    postings = [node for node in nodes if node.get("@type") == "BlogPosting"]
                    self.assertEqual(len(postings), 1)
                    posting = postings[0]
                    self.assertEqual(posting["headline"], post["title"])
                    self.assertEqual(posting["description"], post["excerpt"])
                    self.assertEqual(posting["datePublished"], date)
                    self.assertEqual(posting["inLanguage"], "id-ID")
                    self.assertEqual(posting["mainEntityOfPage"], {"@type": "WebPage", "@id": canonical})
                    self.assertEqual(posting["author"], {"@type": "Person", "@id": ORIGIN + "/#person", "name": "Philip Mulyana", "url": ORIGIN + "/about.html"})
                    self.assertEqual(posting["publisher"], {"@id": ORIGIN + "/#person"})
                else:
                    self.assertNotIn("article:published_time", parser.meta)
                    nodes = schema_nodes(parser.json_ld)
                    self.assertFalse(any(node.get("@type") == "BlogPosting" for node in nodes))

    def test_blog_generator_keeps_metadata_and_schema_for_future_posts(self):
        module = load_publisher()
        post = {
            "Title": "Judul </script><script>alert(1)</script> & Uji",
            "Slug": "judul-uji",
            "Content": "Isi artikel.",
            "Excerpt": "Deskripsi & ringkas.",
            "ReadingTime": "2 menit baca",
            "Category": "personal_finance",
            "CategoryLabel": "Artikel Kami",
            "Author": "Philip Mulyana",
            "Date": "2026-09-19",
        }
        html = module.render_page(post, [post])
        parser = HeadParser()
        parser.feed(html)
        self.assertEqual(parser.meta["og:title"], post["Title"])
        self.assertEqual(parser.meta["og:description"], post["Excerpt"])
        self.assertEqual(parser.meta["article:published_time"], post["Date"])
        postings = [node for node in schema_nodes(parser.json_ld) if node.get("@type") == "BlogPosting"]
        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0]["headline"], post["Title"])
        self.assertIn('/assets/site/site.css', html)
        self.assertIn('/assets/site/article.css', html)
        self.assertIn('class="article-hero"', html)
        self.assertNotIn('cdn.tailwindcss.com', html)
        self.assertNotIn('fonts.googleapis.com', html)
        self.assertNotIn('text-gray-', html)
        sanitizer = html.index('/js/sanitize-attribution.js')
        pixel = html.index('/js/pixel.js')
        clarity = html.index('clarity.ms/tag/')
        self.assertLess(sanitizer, pixel)
        self.assertLess(pixel, clarity)
        self.assertNotIn('</script><script>alert(1)</script>', html)

    def test_blog_generator_rejects_unsafe_output_slugs(self):
        module = load_publisher()
        self.assertEqual(module.blog_output_path("artikel-aman"), ROOT / "blog/artikel-aman.html")
        for slug in ("../../index", "/tmp/evil", "Artikel Dengan Spasi", "bad.html", "a/b"):
            with self.subTest(slug=slug):
                with self.assertRaises(ValueError):
                    module.blog_output_path(slug)

    def test_content_machine_links_are_preserved(self):
        module = load_publisher()
        body = "Baca [tool pensiun](https://philipmulyana.com/tool-retirement.html) sekarang."
        self.assertEqual(module._cm_content(body), body)


if __name__ == "__main__":
    unittest.main()
