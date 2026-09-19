import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PerformanceAssetContract(unittest.TestCase):
    def test_dana_kuliah_uses_shared_woff2_fonts_and_preloads_hero_weights(self):
        css = (ROOT / "product/dana-kuliah/styles.css").read_text(encoding="utf-8")
        html = (ROOT / "product/dana-kuliah/index.html").read_text(encoding="utf-8")

        self.assertNotIn(".ttf", css)
        for weight in (400, 500, 600, 700, 800):
            self.assertIn(f"/assets/homepage/fonts/barlow-{weight}.woff2", css)
        for weight in (400, 700):
            self.assertIn(
                f'<link rel="preload" href="/assets/homepage/fonts/barlow-{weight}.woff2" as="font" type="font/woff2" crossorigin>',
                html,
            )

    def test_blog_preloads_filter_button_font_weight(self):
        html = (ROOT / "blog.html").read_text(encoding="utf-8")
        self.assertIn(
            '<link rel="preload" href="/assets/homepage/fonts/barlow-600.woff2" as="font" type="font/woff2" crossorigin>',
            html,
        )


if __name__ == "__main__":
    unittest.main()
