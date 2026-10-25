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

    def test_homepage_partner_proof_is_an_automatic_carousel_without_controls(self):
        html = read("index.html")
        section = re.search(
            r'<section[^>]+id="company-proof".*?</section>', html, re.S
        )
        self.assertIsNotNone(section)
        assert section is not None
        proof = section.group(0)
        self.assertIn('class="partner-carousel"', proof)
        self.assertIn('class="partner-track"', proof)
        self.assertEqual(proof.count('class="partner-logo-group"'), 2)
        self.assertEqual(proof.count('<img '), 16)
        self.assertIn('aria-hidden="true"', proof)
        self.assertNotIn('data-carousel', proof)
        self.assertNotIn('carousel-control', proof)
        self.assertNotIn('aria-live="polite"', proof)
        self.assertNotIn('Jeda', proof)

        script = read("js/site.js")
        self.assertNotIn("initCarousels", script)
        self.assertNotIn("data-carousel-action", script)

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
        hero = re.search(
            r'<section[^>]+id="consultation-hero".*?</section>', consultation, re.S
        )
        self.assertIsNotNone(hero)
        assert hero is not None
        hero_html = hero.group(0)
        self.assertIn('class="consultation-support"', hero_html)
        self.assertLess(
            hero_html.index('>Jadwalkan First Call</a>'),
            hero_html.index('class="consultation-support"'),
        )

    def test_links_skip_and_footer_targets_are_at_least_44px(self):
        css = re.sub(r'\s+', '', read("assets/site/links.css"))
        self.assertIn('.skip-link{', css)
        self.assertRegex(css, r'\.skip-link\{[^}]*min-height:44px')
        self.assertIn('.links-footera{display:inline-flex;align-items:center;min-height:44px;', css)
        self.assertIn('.collaboration-target.links-shell{padding-bottom:calc(40px+50vh)}', css)

    def test_article_back_link_has_a_44px_touch_target(self):
        css = re.sub(r'\s+', '', read("assets/site/article.css"))
        self.assertIn('.article-back{display:inline-flex;align-items:center;min-height:44px;', css)


class CorporateSpeakerContract(unittest.TestCase):
    logo_alts = (
        "AIA", "Allianz", "AXA Mandiri", "BNI Life", "Prudential Indonesia", "Zurich",
        "Ajaib", "Bank BCA", "Bank CIMB Niaga", "Bank Danamon", "Bank Indonesia",
        "Bank Mandiri", "Bank OCBC Indonesia", "BSI", "Bibit", "HSBC",
        "Indonesia Stock Exchange (IDX)", "IPOT", "KBank", "Mirae Asset Sekuritas",
        "Pegadaian", "Tring by Pegadaian", "PINTU", "Sucor Asset Management", "UOB",
        "Visa", "Kementerian Komunikasi dan Digital Republik Indonesia", "Mekari",
        "Pertamina", "PLN Energi Primer Indonesia", "Polytron", "Sushi Tei",
    )

    def test_corporate_page_is_a_separate_accessible_funnel(self):
        html = read("corporate/index.html")
        self.assertIn('<html lang="id">', html)
        self.assertIn('<link rel="canonical" href="https://philipmulyana.com/corporate/">', html)
        self.assertIn('Corporate Financial Wellbeing — Philip Mulyana', html)
        self.assertIn('/assets/site/corporate.css', html)
        self.assertIn('class="skip-link"', html)
        self.assertIn('<main id="main-content"', html)
        for marker in (
            'id="top"', 'class="audience"', 'id="proof"', 'id="format"',
            'id="modules"', 'id="faq"', 'id="inquiry"',
        ):
            self.assertIn(marker, html)
        self.assertIn('data-clarity-mask="true"', html)
        self.assertIn('window.__PM_PIXEL_NO_AUTOCONFIG__ = true', html)

        sanitizer = html.index('/js/sanitize-attribution.js')
        deferred_trackers = html.index('/js/deferred-trackers.js')
        self.assertLess(sanitizer, deferred_trackers)
        self.assertIn('<script src="/js/deferred-trackers.js" defer></script>', html)
        self.assertNotIn('<script src="/js/pixel.js"></script>', html)
        self.assertNotIn('clarity.ms/tag/', html)

    def test_corporate_cta_never_uses_the_personal_consultation_path(self):
        html = read("corporate/index.html")
        primary_links = re.findall(r'<a\b[^>]*href="#inquiry"[^>]*>(.*?)</a>', html, re.S)
        primary_ctas = [
            label for label in primary_links
            if 'Isi Form Kebutuhan Organisasi' in re.sub(r'<[^>]+>', '', label)
        ]
        self.assertGreaterEqual(len(primary_ctas), 3)

        whatsapp_ctas = re.findall(
            r'<a\b[^>]*data-forward-attribution[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
            html,
            re.S,
        )
        self.assertGreaterEqual(len(whatsapp_ctas), 2)
        for href, label in whatsapp_ctas:
            self.assertIn('WhatsApp', re.sub(r'<[^>]+>', '', label))
            self.assertEqual(href, '/links/#collaboration')
            self.assertNotIn('calendly.com', href)
            self.assertNotIn('/consultation.html', href)
            self.assertNotIn('6282123391967', href)

    def test_corporate_proof_is_neutral_complete_and_local(self):
        html = read("corporate/index.html")
        self.assertIn('>Pernah bekerja sama dengan<', html)
        self.assertIn('Beberapa brand dan organisasi yang pernah berkolaborasi bersama Philip.', html)
        self.assertIn('bukan sebagai pernyataan dukungan terhadap penawaran ini', html)
        self.assertNotIn('corporate speaking clients', html.lower())

        grid_match = re.search(r'<ul class="corporate-partner-grid"[^>]*>(.*?)</ul>', html, re.S)
        self.assertIsNotNone(grid_match)
        grid = grid_match.group(1)
        tiles = re.findall(r'<li\b[^>]*>(.*?)</li>', grid, re.S)
        self.assertEqual(len(tiles), 31)
        images = re.findall(r'<img\b[^>]+src="([^"]+)"[^>]+alt="([^"]+)"', grid)
        self.assertEqual(len(images), 32)
        self.assertEqual({alt for _source, alt in images}, set(self.logo_alts))
        for source, alt in images:
            with self.subTest(logo=alt):
                self.assertTrue(source.startswith('/assets/partners/'))
                self.assertNotIn('://', source)
                self.assertTrue((ROOT / source.removeprefix('/')).is_file())

        self.assertIn('alt="Bank Indonesia"', grid)
        self.assertIn('data-logo-marquee', html)
        self.assertIn('corporate-partner-track', html)
        self.assertNotIn('carousel-control', html)
        self.assertIn('<script src="/js/corporate.js?v=20260928-financial-wellbeing" defer></script>', html)

        provenance = read("assets/partners/corporate/PROVENANCE.md")
        self.assertIn('source url', provenance.lower())
        self.assertIn('retrieved', provenance.lower())
        self.assertIn('trademark', provenance.lower())
        self.assertIn('Bank Indonesia', provenance)
        self.assertIn('78eb8cc9ea226e3d7cfa8dcafa794e3549e076cdb73682cd3117af292534da26', provenance)

    def test_corporate_logo_carousel_profile_and_portrait_respect_contracts(self):
        html = read("corporate/index.html")
        self.assertIn('class="corporate-partner-grid"', html)
        self.assertIn('data-logo-marquee', html)
        self.assertIn('<dt>18 tahun</dt><dd>Di industri keuangan</dd>', html)
        self.assertIn('<dt>10 tahun</dt><dd>Financial Advisor</dd>', html)
        self.assertIn('<dt>50+ brand</dt><dd>Pernah berkolaborasi</dd>', html)
        self.assertRegex(html, r'<img[^>]+corporate-profile\.webp[^>]+width="510"[^>]+height="714"[^>]+fetchpriority="high"')
        self.assertEqual(html.count('/assets/site/logo-white-320.png'), 2)
        self.assertLess((ROOT / 'assets/site/corporate-profile.webp').stat().st_size, 45_000)
        self.assertLess((ROOT / 'assets/site/logo-white-320.png').stat().st_size, 15_000)

        compact = re.sub(r'\s+', '', read("assets/site/corporate.css"))
        self.assertIn('.corporate-partner-grid{display:grid;grid-template-rows:repeat(3,132px)', compact)
        self.assertIn('.corporate-partner-grid{grid-template-rows:116px;grid-auto-columns:154px}', compact)
        self.assertIn('.corporate-partner-grid.tile-dark', compact)
        self.assertIn('filter:grayscale(1)', compact)
        self.assertIn('@media(prefers-reduced-motion:reduce)', compact)
        self.assertIn('corporate-logo-marquee', compact)

        script = read("js/corporate.js")
        self.assertIn('cloneNode(true)', script)
        self.assertIn('IntersectionObserver', script)

    def test_legacy_speaking_route_redirects_to_corporate_canonical(self):
        html = read("speaking.html")
        self.assertIn('url=/corporate/', html.lower())
        self.assertIn('<link rel="canonical" href="https://philipmulyana.com/corporate/">', html)
        self.assertIn('href="/corporate/"', html)

    def test_homepage_offers_corporate_without_mixing_it_with_first_call(self):
        html = read("index.html")
        self.assertIn('href="/corporate/"', html)
        self.assertIn('Corporate Speaker', html)

    def test_corporate_content_has_an_owner_approved_source_contract(self):
        brief = read("corporate/CONTENT_PROVENANCE.md")
        self.assertIn('Owner approval', brief)
        self.assertIn('Corporate Speaker', brief)
        self.assertIn('HR', brief)
        self.assertIn('Personal Finance', brief)
        self.assertIn('no guaranteed', brief.lower())

        links = read("links/index.html")
        self.assertIn('id="collaboration"', links)
        self.assertIn('>FOR COLLAB<', links)


if __name__ == "__main__":
    unittest.main()
