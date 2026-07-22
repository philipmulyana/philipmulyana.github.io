#!/usr/bin/env python3
"""
Tracker guard — enforces Philip's standing rule:
  EVERY published page must include the Meta Pixel (js/pixel.js).

Why this exists: the rule lived only as a comment in pixel.js ("include in
every page"). Nothing enforced it, so hand-authored pages (and legacy
auto-generated blogs) shipped without it. This script makes the rule
mechanical — CI fails the build if any real page is missing the pixel.

A page is EXEMPT only if it is a redirect stub (meta-refresh /
location.replace to another URL) — the visitor lands on the real,
pixeled page within 0s.

Usage:  python3 .github/scripts/check_trackers.py [site_root]
Exit 0 = all real pages carry the pixel. Exit 1 = at least one is missing.
"""
import sys, os, glob, re

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
PIXEL_MARKER = "pixel.js"
BEACON_MARKER = "blog-track.js"   # funnel-stage beacon — required on blog pages
STUB_MARKERS = ('http-equiv="refresh"', "location.replace")


def is_stub(html: str) -> bool:
    return any(m in html for m in STUB_MARKERS)


def is_blog(rel: str) -> bool:
    return rel.replace("\\", "/").startswith("blog/")


def main() -> int:
    files = sorted(
        glob.glob(os.path.join(ROOT, "*.html"))
        + glob.glob(os.path.join(ROOT, "blog", "*.html"))
        + glob.glob(os.path.join(ROOT, "tools", "**", "*.html"), recursive=True)
    )
    missing_pixel, missing_beacon, stubs, ok = [], [], 0, 0
    for f in files:
        try:
            html = open(f, encoding="utf-8").read()
        except Exception as e:
            print(f"  ⚠️  cannot read {f}: {e}")
            continue
        rel = os.path.relpath(f, ROOT)
        if is_stub(html):
            stubs += 1
            continue
        page_ok = True
        if PIXEL_MARKER not in html:
            missing_pixel.append(rel); page_ok = False
        # blog pages must ALSO carry the funnel beacon
        if is_blog(rel) and BEACON_MARKER not in html:
            missing_beacon.append(rel); page_ok = False
        if page_ok:
            ok += 1

    print(f"Tracker guard — {len(files)} html · {ok} ok · {stubs} redirect-stubs · "
          f"{len(missing_pixel)} no-pixel · {len(missing_beacon)} blog-no-beacon")
    if missing_pixel or missing_beacon:
        if missing_pixel:
            print("\n❌ Pages missing the Meta Pixel (js/pixel.js):")
            for m in missing_pixel:
                print(f"    - {m}")
            print("   Fix: add  <script src=\"/js/pixel.js\"></script>  to <head>.")
        if missing_beacon:
            print("\n❌ Blog pages missing the funnel beacon (js/blog-track.js):")
            for m in missing_beacon:
                print(f"    - {m}")
            print("   Fix: add  <script src=\"/js/blog-track.js\"></script>  before </body>.")
        print("\nFor auto-generated blogs, the template in .github/scripts/publish_blogs.py must carry BOTH.")
        return 1
    print("✅ Every real page carries the tracker (blogs carry pixel + funnel beacon).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
