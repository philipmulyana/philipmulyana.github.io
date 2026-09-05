#!/usr/bin/env python3
"""
Deterministic containment test — MKT-2026-09-05-CEK-AWAL-META-AUTOEVENT-CONTAINMENT-V1.

Proves, by static inspection of the two authorized files, that:
  1. autoConfig is switched off, and 'set' runs before 'init' (order matters:
     autoConfig must apply before the pixel configures itself for this init).
  2. The opt-out is page-scoped: it fires only behind a flag that only
     /cek-awal/index.html sets, and only after the URL scrub succeeds.
  3. Exactly one, unconditional PageView still fires in pixel.js.
  4. The frozen quiz copy (COPY block in index.html) is byte-for-byte
     unchanged, via a hash pinned before this containment change.

Usage:  python3 .github/scripts/test_cek_awal_autoconfig.py [site_root]
Exit 0 = all checks pass. Exit 1 = at least one failed.
"""
import sys, os, re, hashlib

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
HTML_PATH = os.path.join(ROOT, "cek-awal", "index.html")
PIXEL_PATH = os.path.join(ROOT, "js", "pixel.js")
PIXEL_ID = "1408957391027533"
FLAG = "__CEK_AWAL_PIXEL_NO_AUTOCONFIG__"

# Pinned before this change: sha256 of the exact `var COPY = {...}` object
# literal in cek-awal/index.html (the questions, options, and every other
# audience-facing string). If this hash changes, the assessment changed.
EXPECTED_COPY_HASH = "064a00e787cadd3f3afd7d3276533eae26405cb12ee4f9f1249fd6716ece0caa"

failures = []


def check(label, condition):
    print(("  ok   " if condition else "  FAIL ") + label)
    if not condition:
        failures.append(label)


def extract_balanced(text, start_marker):
    start = text.index(start_marker)
    brace_start = text.index("{", start)
    depth = 0
    i = brace_start
    while True:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    return text[brace_start:i + 1]


def main():
    html = open(HTML_PATH, encoding="utf-8").read()
    pixel = open(PIXEL_PATH, encoding="utf-8").read()

    # --- 1. assessment hash unchanged ---
    copy_block = extract_balanced(html, "var COPY = {")
    actual_hash = hashlib.sha256(copy_block.encode("utf-8")).hexdigest()
    check("assessment COPY block hash unchanged", actual_hash == EXPECTED_COPY_HASH)

    # --- 2. index.html: flag set only after the URL scrub, before injection ---
    idx_scrub = html.index("replaceState")
    idx_flag = html.index(FLAG)
    idx_inject = html.index('src="/js/pixel.js"')
    check("URL scrub happens before the flag is set", idx_scrub < idx_flag)
    check("flag is set before /js/pixel.js is injected", idx_flag < idx_inject)

    # The flag assignment and the injection must both live inside the same
    # `if (queryFree) { ... }` guard, i.e. no unconditional flag-setting.
    guard_start = html.index("if (queryFree)")
    guard_body = extract_balanced(html, "if (queryFree)")
    check("flag assignment is inside the queryFree guard", FLAG in guard_body)
    check("pixel injection is inside the queryFree guard", 'src="/js/pixel.js"' in guard_body)

    # --- 3. pixel.js: command order and page-only scope ---
    idx_set = pixel.find("fbq('set', 'autoConfig', false")
    idx_init = pixel.find("fbq('init', '%s')" % PIXEL_ID)
    idx_track = pixel.find("fbq('track', 'PageView')")
    check("pixel.js contains the autoConfig(false) call", idx_set != -1)
    check("pixel.js contains init", idx_init != -1)
    check("pixel.js contains track PageView", idx_track != -1)
    check("'set' autoConfig precedes 'init'", -1 < idx_set < idx_init)
    check("'init' precedes 'track' PageView", idx_init < idx_track)

    check("autoConfig targets this pixel ID", PIXEL_ID in pixel[idx_set:idx_set + 80])

    # Page-only scope: the autoConfig call must be gated behind the same flag
    # name the html sets, and must be the ONLY reference to that flag in
    # pixel.js's guard condition (so untouched pages, where the flag is
    # undefined, never call it).
    guard_match = re.search(
        r"if\s*\(\s*window\.%s\s*\)\s*\{([^}]*)\}" % re.escape(FLAG), pixel
    )
    check("autoConfig call is gated behind window.%s" % FLAG, bool(guard_match))
    if guard_match:
        check("only the autoConfig call sits behind the flag",
              "fbq('set', 'autoConfig', false" in guard_match.group(1))

    # Exactly one PageView call, unconditional (not inside the flag guard).
    track_calls = re.findall(r"fbq\('track',\s*'PageView'\)", pixel)
    check("exactly one PageView call in pixel.js", len(track_calls) == 1)
    if guard_match:
        check("PageView call is outside the autoConfig guard",
              "PageView" not in guard_match.group(1))

    # --- 4. no other page sets the flag (page-only scope, repo-wide) ---
    other_setters = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        if ".git" in dirpath.split(os.sep):
            continue
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            fp = os.path.join(dirpath, fn)
            if fp == HTML_PATH:
                continue
            try:
                content = open(fp, encoding="utf-8").read()
            except Exception:
                continue
            if FLAG in content:
                other_setters.append(os.path.relpath(fp, ROOT))
    check("no page other than cek-awal/index.html references the flag",
          not other_setters)
    if other_setters:
        print("    unexpected flag references: %s" % ", ".join(other_setters))

    print()
    if failures:
        print("FAILED (%d):" % len(failures))
        for f in failures:
            print("  - " + f)
        return 1
    print("PASSED — all containment checks hold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
