import importlib.util
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".github" / "scripts" / "generate_sitemap.py"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def load_generator():
    spec = importlib.util.spec_from_file_location("generate_sitemap", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load sitemap generator: {SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SitemapGenerationContract(unittest.TestCase):
    def test_generator_adds_new_canonical_blog_and_excludes_non_indexable_pages(self):
        generator = load_generator()
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "blog").mkdir()
            (site / "index.html").write_text(
                '<link rel="canonical" href="https://philipmulyana.com/">',
                encoding="utf-8",
            )
            (site / "blog" / "new-post.html").write_text(
                '<link rel="canonical" href="https://philipmulyana.com/blog/new-post.html">',
                encoding="utf-8",
            )
            (site / "blog" / "private.html").write_text(
                '<meta name="robots" content="noindex, follow">'
                '<meta name="robots" content="index, follow">'
                '<link rel="canonical" href="https://philipmulyana.com/blog/private.html">',
                encoding="utf-8",
            )
            (site / "today.html").write_text(
                '<link rel="canonical" href="https://philipmulyana.com/blog/redirect-target.html">'
                "<meta content='0; url=/blog/redirect-target.html' http-equiv='Refresh'>",
                encoding="utf-8",
            )
            (site / "blog" / "external.html").write_text(
                '<link rel="canonical" href="https://example.com/external.html">',
                encoding="utf-8",
            )

            output = generator.write_sitemap(site)
            root = ET.parse(output).getroot()
            locations = [
                (node.text or "").strip()
                for node in root.findall("sm:url/sm:loc", SITEMAP_NS)
            ]

            self.assertEqual(
                locations,
                [
                    "https://philipmulyana.com/",
                    "https://philipmulyana.com/blog/new-post.html",
                ],
            )

    def test_generator_keeps_existing_sitemap_when_no_indexable_pages_exist(self):
        generator = load_generator()
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            existing = "existing sitemap\n"
            (site / "sitemap.xml").write_text(existing, encoding="utf-8")
            (site / "index.html").write_text(
                '<meta name="robots" content="noindex">', encoding="utf-8"
            )

            with self.assertRaisesRegex(ValueError, "No indexable canonical URLs"):
                generator.write_sitemap(site)

            self.assertEqual(
                (site / "sitemap.xml").read_text(encoding="utf-8"), existing
            )

    def test_blog_publish_workflow_regenerates_and_commits_sitemap(self):
        workflow = (ROOT / ".github" / "workflows" / "publish-blogs.yml").read_text(
            encoding="utf-8"
        )
        publish_command = "python .github/scripts/publish_blogs.py"
        sitemap_command = "python .github/scripts/generate_sitemap.py"

        self.assertIn(sitemap_command, workflow)
        self.assertLess(workflow.index(publish_command), workflow.index(sitemap_command))
        self.assertIn("git add blog/ data/posts.json sitemap.xml", workflow)


if __name__ == "__main__":
    unittest.main()
