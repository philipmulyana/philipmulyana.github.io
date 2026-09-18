import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def script_position(html: str, needle: str) -> int:
    position = html.find(needle)
    if position == -1:
        raise AssertionError(f"Expected script marker not found: {needle}")
    return position


class SharedMultipageContract(unittest.TestCase):
    redesigned_pages = (
        "about.html",
        "blog.html",
        "consultation.html",
        "tools/index.html",
    )

    def test_redesigned_pages_use_local_brand_system_and_safe_tracker_order(self):
        for page in self.redesigned_pages:
            with self.subTest(page=page):
                html = read(page)
                self.assertRegex(html, r'<html\s+lang="id"')
                self.assertIn('/assets/site/site.css', html)
                self.assertNotIn('cdn.tailwindcss.com', html)
                self.assertNotIn('fonts.googleapis.com', html)
                self.assertNotIn('placehold.co', html)
                sanitizer = script_position(html, '/js/sanitize-attribution.js')
                pixel = script_position(html, '/js/pixel.js')
                clarity = script_position(html, 'clarity.ms/tag')
                self.assertLess(sanitizer, pixel)
                self.assertLess(pixel, clarity)

    def test_redesigned_pages_have_skip_link_semantic_main_and_minimal_header(self):
        for page in self.redesigned_pages:
            with self.subTest(page=page):
                html = read(page)
                self.assertIn('class="skip-link"', html)
                self.assertIn('href="#main-content"', html)
                self.assertIn('<main id="main-content"', html)
                self.assertRegex(html, r'<a[^>]+class="brand"[^>]+href="/"')
                header = re.search(r'<header\b.*?</header>', html, re.S)
                self.assertIsNotNone(header)
                assert header is not None
                header_html = header.group(0)
                self.assertIn('href="/consultation.html"', header_html)
                self.assertIn('>Konsultasi<', header_html)
                self.assertNotIn('>Online Course<', header_html)
                self.assertNotIn('>Tentang Philip<', header_html)
                self.assertNotIn('>Artikel<', header_html)

    def test_red_section_copy_keeps_accessible_contrast(self):
        css = read("assets/site/site.css")
        self.assertIn('.section-red .section-heading p{color:var(--white)}', css)


class HomepageContract(unittest.TestCase):
    def setUp(self):
        self.html = read("index.html")

    def test_homepage_uses_approved_cta_navigation_and_section_order(self):
        self.assertIn('>Mulai dari Sini<', self.html)
        self.assertNotIn('Pilih Titik Mulai', self.html)
        header_match = re.search(r'<header\b.*?</header>', self.html, re.S)
        self.assertIsNotNone(header_match)
        assert header_match is not None
        header = header_match.group(0)
        self.assertIn('href="/consultation.html"', header)
        self.assertEqual(header.count('<nav'), 1)
        self.assertEqual(header.count('href="/consultation.html"'), 1)

        order = [
            'id="hero"',
            'id="credentials"',
            'id="artikel-terbaru"',
            'id="course"',
            'id="first-call"',
            'id="tentang"',
        ]
        positions = [self.html.index(marker) for marker in order]
        self.assertEqual(positions, sorted(positions))

    def test_homepage_latest_articles_match_three_latest_valid_static_posts(self):
        posts = json.loads(read("data/posts.json"))["posts"]
        valid_posts = [post for post in posts if post.get("date") and post.get("slug")]
        latest = sorted(valid_posts, key=lambda post: post["date"], reverse=True)[:3]
        section_match = re.search(
            r'<section[^>]+id="artikel-terbaru".*?</section>', self.html, re.S
        )
        self.assertIsNotNone(section_match)
        assert section_match is not None
        section = section_match.group(0)
        for post in latest:
            self.assertIn(post["title"], section)
            self.assertIn(f'/blog/{post["slug"]}.html', section)
            self.assertIn(post["readingTime"], section)
        self.assertIn('href="/blog.html"', section)
        self.assertIn('>Lihat Semua Artikel<', section)

    def test_first_call_is_only_consultation_entry_and_legacy_labels_are_removed(self):
        self.assertIn('id="first-call"', self.html)
        self.assertIn('Jadwalkan First Call', self.html)
        self.assertIn('https://calendly.com/philipmulyana/first-call', self.html)
        self.assertIn('Policy Review', self.html)
        for rejected in ('Discovery Meeting', 'Protection Review', 'Pilih Titik Mulai'):
            self.assertNotIn(rejected, self.html)


class AboutContract(unittest.TestCase):
    def setUp(self):
        self.html = read("about.html")

    def test_about_uses_only_verified_bio_and_official_portrait(self):
        self.assertIn('/assets/homepage/profile-photo.webp', self.html)
        self.assertIn('2008', self.html)
        self.assertIn('2014', self.html)
        self.assertIn('2019', self.html)
        self.assertIn('Certified Financial Planner', self.html)
        self.assertNotIn('Financial Literacy Summit', self.html)
        self.assertNotIn('InsurTech Startup Meetup', self.html)
        self.assertNotIn('500+', self.html)


class ConsultationContract(unittest.TestCase):
    def setUp(self):
        self.html = read("consultation.html")

    def test_consultation_uses_approved_first_call_contract(self):
        expected = (
            'First Call adalah panggilan gratis selama 10 menit untuk mendengar '
            'situasimu dan melihat apakah Konsultasi Asuransi relevan sebelum '
            'masuk ke sesi berikutnya.'
        )
        self.assertIn(expected, self.html)
        self.assertIn('Gratis 10 menit lewat telepon.', self.html)
        self.assertIn('Jadwalkan First Call', self.html)
        self.assertIn('https://calendly.com/philipmulyana/first-call', self.html)
        self.assertIn('Philip adalah agen Prudential.', self.html)
        self.assertIn('Policy Review', self.html)

    def test_consultation_does_not_overpromise_first_call(self):
        for rejected in (
            'WhatsApp Call',
            '500Jt+',
            'Needs Analysis',
            'Product Recommendation',
            'Personalized Plan',
            'Discovery Meeting',
            'Protection Review',
        ):
            self.assertNotIn(rejected, self.html)

    def test_unverified_testimonials_are_not_published(self):
        testimonials = json.loads(read("data/testimonials.json"))
        for testimonial in testimonials:
            self.assertNotIn(testimonial["text"], self.html)
            self.assertNotIn(testimonial["name"], self.html)


class BlogContract(unittest.TestCase):
    def test_blog_has_accessible_controls_and_real_static_source(self):
        html = read("blog.html")
        self.assertIn('<h1>Blog &amp; Insights</h1>', html)
        self.assertNotIn('<h1>Blog &amp; Insights.</h1>', html)
        self.assertNotIn('>Artikel.</h2>', html)
        self.assertIn('id="blog-list"', html)
        self.assertIn('id="blog-status"', html)
        self.assertIn('/js/blog.js', html)
        self.assertNotIn('data/blog.json', html)
        posts = json.loads(read("data/posts.json"))["posts"]
        self.assertGreaterEqual(len(posts), 3)
        for post in posts:
            self.assertTrue((ROOT / "blog" / f'{post["slug"]}.html').exists())

    def test_article_pages_use_local_reading_shell_and_safe_tracker_order(self):
        posts = json.loads(read("data/posts.json"))["posts"]
        for post in posts:
            page = f'blog/{post["slug"]}.html'
            html = read(page)
            with self.subTest(page=page):
                if 'http-equiv="refresh"' in html:
                    self.assertIn('url=/blog/', html)
                    self.assertNotIn('/js/pixel.js', html)
                    self.assertNotIn('cdn.tailwindcss.com', html)
                    continue
                self.assertIn('/assets/site/site.css', html)
                self.assertIn('/assets/site/article.css', html)
                self.assertNotIn('cdn.tailwindcss.com', html)
                self.assertNotIn('fonts.googleapis.com', html)
                sanitizer = script_position(html, '/js/sanitize-attribution.js')
                pixel = script_position(html, '/js/pixel.js')
                clarity = script_position(html, 'clarity.ms/tag')
                self.assertLess(sanitizer, pixel)
                self.assertLess(pixel, clarity)


class ToolsContract(unittest.TestCase):
    def test_tools_catalog_contains_only_existing_six_routes_and_clear_boundary(self):
        html = read("tools/index.html")
        expected_routes = (
            '/tools/risk-profile/',
            '/tools/retirement/',
            '/tools/education/',
            '/tools/proteksi/',
            '/tools/assessment/',
            '/tools/assessment-jiwa/',
        )
        for route in expected_routes:
            self.assertIn(f'href="{route}"', html)
        self.assertIn('gambaran awal', html.lower())
        self.assertNotIn('bg-gradient-to-br', html)

    def test_legacy_tools_route_remains_a_noindex_redirect(self):
        html = read("tools.html")
        self.assertIn('content="noindex, follow"', html)
        self.assertIn('url=/tools/', html)
        self.assertIn("window.location.replace", html)
        self.assertIn('/js/sanitize-attribution.js', html)
        self.assertNotIn('/js/pixel.js', html)
        self.assertLess(
            html.index('/js/sanitize-attribution.js'),
            html.index('window.location.replace'),
        )


if __name__ == "__main__":
    unittest.main()
