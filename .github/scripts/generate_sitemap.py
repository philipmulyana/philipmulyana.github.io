#!/usr/bin/env python3
"""Generate sitemap.xml from canonical, indexable production HTML files."""

import glob
import html
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


SITE_ORIGIN = "https://philipmulyana.com"
PUBLISHED_PATTERNS = (
    "*.html",
    "blog/*.html",
    "tools/**/*.html",
    "product/**/*.html",
    "links/**/*.html",
    "corporate/**/*.html",
    "privacy-policy/**/*.html",
)
SCRIPT_REDIRECT_MARKERS = ("location.replace",)


class SeoSignalsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.noindex = False
        self.redirect = False

    def handle_starttag(self, tag, attrs):
        values = {name.lower(): value for name, value in attrs if value is not None}
        if tag.lower() == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href")
        if tag.lower() == "meta" and values.get("name", "").lower() == "robots":
            directives = values.get("content", "").lower().replace(",", " ").split()
            self.noindex = self.noindex or "noindex" in directives
        if tag.lower() == "meta" and values.get("http-equiv", "").lower() == "refresh":
            self.redirect = True


def published_html_files(site_root):
    site_root = Path(site_root)
    paths = set()
    for pattern in PUBLISHED_PATTERNS:
        paths.update(Path(path) for path in glob.glob(str(site_root / pattern), recursive=True))
    return sorted(paths)


def indexable_canonicals(site_root):
    urls = set()
    for path in published_html_files(site_root):
        source = path.read_text(encoding="utf-8")
        lowered = source.lower()
        if any(marker in lowered for marker in SCRIPT_REDIRECT_MARKERS):
            continue
        parser = SeoSignalsParser()
        parser.feed(source)
        if parser.redirect or parser.noindex or not parser.canonical:
            continue
        parsed = urlparse(parser.canonical)
        if (
            parsed.scheme == "https"
            and parsed.netloc == "philipmulyana.com"
            and not parsed.query
            and not parsed.fragment
        ):
            urls.add(parser.canonical)
    return sorted(urls, key=lambda url: (url != SITE_ORIGIN + "/", url))


def render_sitemap(urls):
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in urls:
        lines.extend(("  <url>", f"    <loc>{html.escape(url)}</loc>", "  </url>"))
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def write_sitemap(site_root):
    site_root = Path(site_root)
    urls = indexable_canonicals(site_root)
    if not urls:
        raise ValueError("No indexable canonical URLs; sitemap was not changed")
    output = site_root / "sitemap.xml"
    output.write_text(render_sitemap(urls), encoding="utf-8")
    return output


if __name__ == "__main__":
    write_sitemap(Path(__file__).resolve().parents[2])
