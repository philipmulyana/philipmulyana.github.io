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
STUB_MARKERS = ('http-equiv="refresh"', "location.replace")


def is_stub(html: str) -> bool:
    return any(m in html for m in STUB_MARKERS)


def main() -> int:
    files = sorted(
        glob.glob(os.path.join(ROOT, "*.html"))
        + glob.glob(os.path.join(ROOT, "blog", "*.html"))
        + glob.glob(os.path.join(ROOT, "tools", "**", "*.html"), recursive=True)
    )
    missing, stubs, ok = [], 0, 0
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
        if PIXEL_MARKER in html:
            ok += 1
        else:
            missing.append(rel)

    print(f"Tracker guard — {len(files)} html · {ok} pixeled · {stubs} redirect-stubs · {len(missing)} MISSING")
    if missing:
        print("\n❌ Pages missing the Meta Pixel (js/pixel.js):")
        for m in missing:
            print(f"    - {m}")
        print("\nFix: add  <script src=\"/js/pixel.js\"></script>  to <head>.")
        print("For auto-generated blogs, the template in .github/scripts/publish_blogs.py must carry it.")
        return 1
    print("✅ Every real page carries the tracker.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
