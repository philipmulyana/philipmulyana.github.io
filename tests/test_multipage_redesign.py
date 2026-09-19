import hashlib
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
                self.assertIn('>Konsultasi Asuransi<', header_html)
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
            'id="company-proof"',
            'id="artikel-terbaru"',
            'id="course"',
            'id="first-call"',
            'id="tentang"',
        ]
        positions = [self.html.index(marker) for marker in order]
        self.assertEqual(positions, sorted(positions))

    def test_homepage_partner_proof_restores_automatic_monochrome_carousel_without_controls(self):
        expected_partners = {
            "Bank BCA": "bca-official.png",
            "Bank Mandiri": "bank-mandiri.png",
            "Bank CIMB Niaga": "cimb-niaga.png",
            "BSI (Bank Syariah Indonesia)": "bsi.png",
            "HSBC": "hsbc-wordmark.svg",
            "Pertamina": "pertamina.png",
            "UOB": "uob.png",
            "Visa": "visa.svg",
        }
        excluded_insurance_brands = (
            "AIA", "Allianz", "AXA Mandiri", "BNI Life", "Prudential", "Zurich"
        )
        section_match = re.search(
            r'<section[^>]+id="company-proof"([^>]*)>(.*?)</section>',
            self.html,
            re.S,
        )
        self.assertIsNotNone(section_match)
        assert section_match is not None
        attributes, section = section_match.groups()
        self.assertNotIn("hidden", attributes)
        self.assertIn("Pernah bekerja sama dengan", section)
        self.assertNotIn("2023–2026", section)
        self.assertNotIn("49 brand", section)
        self.assertIn('class="partner-carousel"', section)
        self.assertIn('class="partner-track"', section)
        self.assertNotIn('data-carousel', section)
        self.assertNotIn('carousel-controls', section)
        self.assertNotIn('>Jeda<', section)
        self.assertNotIn("swiper", section.lower())
        self.assertNotIn("slick", section.lower())

        visible_group = re.search(
            r'<ul class="partner-logo-group"[^>]*>(.*?)</ul>',
            section,
            re.S,
        )
        self.assertIsNotNone(visible_group)
        assert visible_group is not None
        self.assertEqual(visible_group.group(1).count("<img"), len(expected_partners))
        self.assertEqual(section.count('class="partner-logo-group"'), 2)
        self.assertEqual(section.count('<img '), len(expected_partners) * 2)
        self.assertIn('aria-hidden="true"', section)
        duplicate_group = re.search(
            r'<ul class="partner-logo-group" aria-hidden="true">(.*?)</ul>',
            section,
            re.S,
        )
        self.assertIsNotNone(duplicate_group)
        assert duplicate_group is not None
        duplicate_images = re.findall(r'<img\b[^>]+>', duplicate_group.group(1))
        self.assertEqual(len(duplicate_images), len(expected_partners))
        for image in duplicate_images:
            self.assertIn('alt=""', image)

        for partner, filename in expected_partners.items():
            src = f'/assets/partners/{filename}'
            self.assertIn(f'src="{src}"', visible_group.group(1), partner)
            self.assertIn(f'alt="{partner}"', visible_group.group(1), partner)
            self.assertTrue((ROOT / src.lstrip("/")).is_file(), filename)
        for image in re.findall(r'<img\b[^>]+>', section):
            self.assertRegex(image, r'\bwidth="\d+"')
            self.assertRegex(image, r'\bheight="\d+"')
            self.assertIn('loading="lazy"', image)
            self.assertIn('decoding="async"', image)

        css = read("assets/site/site.css")
        compact_css = re.sub(r"\s+", "", css)
        self.assertIn("@keyframespartner-marquee", compact_css)
        self.assertIn("animation-play-state:paused", compact_css)
        self.assertIn('.partner-logo-group{display:flex;', compact_css)
        self.assertIn('@media(max-width:760px)', compact_css)
        self.assertIn('filter:grayscale(1)', compact_css)
        self.assertIn('opacity:.56', compact_css)
        self.assertIn('.partner-track{display:block;width:auto;animation:none!important;will-change:auto}', compact_css)
        self.assertIn('.partner-logo-group[aria-hidden="true"]{display:none}', compact_css)
        self.assertTrue((ROOT / "assets/partners/PROVENANCE.md").is_file())
        for insurance_brand in excluded_insurance_brands:
            self.assertNotIn(insurance_brand, section)
        for placeholder in ("Brand 1", "Brand 2", "Brand 3", "Brand 4", "Brand 5", "Brand 6"):
            self.assertNotIn(placeholder, section)

    def test_homepage_partner_carousel_uses_restored_treatment_and_verified_full_wordmarks(self):
        self.assertIn(
            'href="/assets/site/site.css?v=20260919-big-alpha-carousel"',
            self.html,
        )

        expected_asset_hashes = {
            "assets/partners/bca-official.png": "d9eca606e2b56eff45e708150a7a3fd80e2d1ad3215345f4428d39c49869176d",
            "assets/partners/hsbc-wordmark.svg": "004c7f9d3b35dbd7312c8e15d42af3b0396426cccdb1626b4ff12238f57193b1",
        }
        for relative_path, expected_hash in expected_asset_hashes.items():
            actual_hash = hashlib.sha256((ROOT / relative_path).read_bytes()).hexdigest()
            self.assertEqual(actual_hash, expected_hash, relative_path)

        provenance = read("assets/partners/PROVENANCE.md")
        self.assertIn("https://www.bca.co.id/id/tentang-bca/media-riset/pressroom/Brand-Assets", provenance)
        self.assertIn("https://commons.wikimedia.org/wiki/File:HSBC_logo_(2018).svg", provenance)
        self.assertNotIn("File:BCA_logo.svg", provenance)
        self.assertNotIn("simple-icons/simple-icons/blob/16.31.0/icons/hsbc.svg", provenance)

        css = read("assets/site/site.css")
        partner_css = css[css.index(".partner-proof"):css.index(".timeline")]
        compact_partner_css = re.sub(r"\s+", "", partner_css)
        self.assertIn("filter:grayscale(1)", compact_partner_css)
        self.assertIn("opacity:.56", compact_partner_css)
        self.assertIn("mask-image:linear-gradient", compact_partner_css)
        self.assertNotIn("border-right", compact_partner_css)
        self.assertNotIn("background:var(--white)", compact_partner_css)

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

    def test_consultation_places_approved_brand_proof_between_hero_and_first_call(self):
        hero = self.html.index('class="page-hero"')
        proof = self.html.index('id="consultation-proof"')
        first_call = self.html.index('id="first-call"')
        self.assertLess(hero, proof)
        self.assertLess(proof, first_call)
        self.assertIn('/assets/site/site.css?v=20260919-consultation-proof', self.html)

        section = re.search(
            r'<section[^>]+id="consultation-proof".*?</section>', self.html, re.S
        )
        self.assertIsNotNone(section)
        assert section is not None
        proof_html = section.group(0)
        self.assertIn('Pengalaman Philip dalam Angka', proof_html)
        self.assertIn('18+ tahun', proof_html)
        self.assertIn('di financial services, sejak 2008', proof_html)
        self.assertIn('12+ tahun', proof_html)
        self.assertIn('sebagai Financial Advisor, sejak 2014', proof_html)
        proof_text = re.sub(r'<[^>]+>', '', proof_html)
        self.assertIn('Tahun ke-4', proof_text)
        self.assertIn('data-year-number-since="2023"', proof_html)
        self.assertIn('bersama Prudential, sejak 2023', proof_html)
        self.assertIn('100+ klien', proof_html)
        self.assertIn('telah dilayani', proof_html)
        self.assertNotIn('90+ klien', proof_html)
        self.assertNotIn('100+ pemegang polis', proof_html)
        self.assertNotIn('100+ keluarga terlindungi', proof_html)
        self.assertIn('kamu tidak wajib membeli produk apa pun', proof_html)

        compact_css = re.sub(r'\s+', '', read("assets/site/site.css"))
        self.assertIn('.consultation-proof-grid{display:grid;grid-template-columns:repeat(4,1fr)', compact_css)
        self.assertIn('@media(max-width:760px)', compact_css)
        self.assertIn('.consultation-proof-grid{grid-template-columns:repeat(2,1fr)', compact_css)

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

    def test_existing_testimonials_are_published_verbatim_near_first_call(self):
        testimonials = json.loads(read("data/testimonials.json"))
        selected = testimonials[:3]
        withheld = testimonials[3:]

        for page in ("index.html", "consultation.html"):
            with self.subTest(page=page):
                html = read(page)
                section_match = re.search(
                    r'<section[^>]+id="first-call".*?</section>', html, re.S
                )
                self.assertIsNotNone(section_match)
                assert section_match is not None
                section = section_match.group(0)

                self.assertIn('Pengalaman berdiskusi dengan Philip', section)
                self.assertEqual(section.count('<blockquote'), 3)
                self.assertNotIn('Testimonial First Call', section)
                self.assertNotIn('carousel', section.lower())

                for testimonial in selected:
                    self.assertEqual(section.count(testimonial["text"]), 1)
                    self.assertEqual(section.count(testimonial["name"]), 1)

                for testimonial in withheld:
                    self.assertNotIn(testimonial["text"], section)
                    self.assertNotIn(testimonial["name"], section)


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
