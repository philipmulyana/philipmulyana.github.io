import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class ArticleConsultationJourneyContract(unittest.TestCase):
    def test_active_articles_use_shared_shell_and_consultation_explainer_cta(self):
        posts = json.loads(read("data/posts.json"))["posts"]

        for post in posts:
            page = f'blog/{post["slug"]}.html'
            html = read(page)
            with self.subTest(page=page):
                if 'http-equiv="refresh"' in html:
                    continue

                self.assertIn('/assets/site/site.css', html)
                self.assertIn('/assets/site/article.css', html)
                self.assertNotIn('cdn.tailwindcss.com', html)
                self.assertNotIn('fonts.googleapis.com', html)
                self.assertIn('class="skip-link"', html)
                self.assertIn('<main id="main-content"', html)
                self.assertIn('>Konsultasi Asuransi<', html)
                self.assertNotIn('>Book Now<', html)
                self.assertNotIn('>Consultation<', html)

                cta_match = re.search(
                    r'<section class="article-cta".*?</section>', html, re.S
                )
                self.assertIsNotNone(cta_match)
                assert cta_match is not None
                cta = cta_match.group(0)
                self.assertIn('Ingin membahas situasimu lebih lanjut?', cta)
                self.assertIn('Pelajari Konsultasi Asuransi', cta)
                self.assertIn('href="/consultation.html"', cta)
                self.assertNotIn('calendly.com', cta)
                self.assertNotIn('instagram.com', cta)
                self.assertNotIn('DM Saya', cta)


class SharedUiAuditContract(unittest.TestCase):
    core_pages = (
        "index.html",
        "about.html",
        "consultation.html",
        "blog.html",
        "tools/index.html",
    )

    def test_core_navigation_names_the_service_and_has_touch_sized_links(self):
        for page in self.core_pages:
            with self.subTest(page=page):
                html = read(page)
                header = re.search(r'<header\b.*?</header>', html, re.S)
                self.assertIsNotNone(header)
                assert header is not None
                self.assertIn('>Konsultasi Asuransi<', header.group(0))

        compact_css = re.sub(r"\s+", "", read("assets/site/site.css"))
        self.assertRegex(
            compact_css,
            r"\.navigationnava\{[^}]*min-height:44px",
        )
        self.assertRegex(
            compact_css,
            r"\.footera\{[^}]*min-height:44px",
        )

    def test_homepage_testimonials_use_supporting_not_headline_scale(self):
        compact_css = re.sub(r"\s+", "", read("assets/site/site.css"))
        self.assertIn(
            ".quoteblockquote{margin:0;font-size:clamp(20px,2.4vw,28px)",
            compact_css,
        )
        self.assertRegex(
            compact_css,
            r"\.quoteblockquote\{[^}]*line-height:1\.35",
        )

    def test_homepage_partner_carousel_has_visible_controls(self):
        html = read("index.html")
        section = re.search(
            r'<section[^>]+id="company-proof".*?</section>', html, re.S
        )
        self.assertIsNotNone(section)
        assert section is not None
        proof = section.group(0)
        self.assertIn('data-carousel-action="previous"', proof)
        self.assertIn('data-carousel-action="toggle"', proof)
        self.assertIn('data-carousel-action="next"', proof)
        self.assertIn('aria-live="polite"', proof)

        script = read("js/site.js")
        self.assertIn("initCarousels", script)
        self.assertIn("prefers-reduced-motion", script)

    def test_blog_uses_indonesian_filters_and_progressive_reveal(self):
        html = read("blog.html")
        for label in ("Semua", "Asuransi", "Investasi", "Keuangan Pribadi", "Ekonomi"):
            self.assertIn(f'>{label}<', html)
        for rejected in (">All<", ">Insurance<", ">Investment<", ">Personal Finance<", ">Economy<"):
            self.assertNotIn(rejected, html)
        self.assertIn('id="blog-load-more"', html)
        self.assertIn('>Muat lebih banyak<', html)

        script = read("js/blog.js")
        self.assertIn("const PAGE_SIZE = 12", script)
        self.assertIn("visibleCount", script)

    def test_page_headlines_and_consultation_reassurance_are_kept_near_the_cta(self):
        compact_css = re.sub(r"\s+", "", read("assets/site/site.css"))
        self.assertIn(
            ".page-heroh1{max-width:920px;margin:10px024px;font-size:clamp(48px,6vw,82px)",
            compact_css,
        )
        consultation = read("consultation.html")
        self.assertIn('class="hero-reassurance"', consultation)


if __name__ == "__main__":
    unittest.main()
