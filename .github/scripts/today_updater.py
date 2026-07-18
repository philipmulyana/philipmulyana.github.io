#!/usr/bin/env python3
"""
/today redirect updater — runs in GitHub Actions daily at 00:00 WIB.

Reads Airtable Stories, finds the blog-driver story publishing TODAY (WIB) that has
a `Blog Target URL`, and rewrites today.html so philipmulyana.com/today redirects
there. ManyChat holds the static /today URL forever; this re-points it each day.

Env: AIRTABLE_TOKEN (GitHub Actions secret). Base id is not sensitive (useless
without the token). Writes today.html in the repo root; the workflow commits it.
"""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

TOKEN = os.environ["AIRTABLE_TOKEN"]
BASE = os.environ.get("AIRTABLE_BASE", "appqIkiQc23r9UU2T")
WIB = timezone(timedelta(hours=7))
AT = f"https://api.airtable.com/v0/{BASE}/Stories"


def todays_blog_url():
    today = datetime.now(WIB).date()
    q = urllib.parse.urlencode({"filterByFormula": "{Blog Target URL}!=''", "pageSize": 100})
    req = urllib.request.Request(f"{AT}?{q}", headers={"Authorization": f"Bearer {TOKEN}"})
    recs = json.loads(urllib.request.urlopen(req, timeout=30).read()).get("records", [])
    cands = []
    for r in recs:
        f = r["fields"]
        pub, url = f.get("Publish At"), f.get("Blog Target URL")
        if not pub or not url:
            continue
        dt = datetime.fromisoformat(pub.replace("Z", "+00:00")).astimezone(WIB)
        if dt.date() == today:
            cands.append((dt, url, f.get("Title", r["id"])))
    cands.sort()
    return cands[0] if cands else None


def redirect_html(blog_url):
    path = urllib.parse.urlparse(blog_url).path or "/blog/"
    return (
        '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">\n'
        "<title>Artikel Hari Ini…</title>\n"
        '<meta name="robots" content="noindex">\n'
        f'<link rel="canonical" href="{blog_url}">\n'
        f'<meta http-equiv="refresh" content="0; url={path}">\n'
        f"<script>window.location.replace('{path}');</script>\n"
        f'</head><body>Menuju artikel hari ini… <a href="{path}">klik di sini kalau tidak otomatis</a>.</body></html>\n'
    )


def main():
    res = todays_blog_url()
    if not res:
        print(f"no blog-driver story publishing today ({datetime.now(WIB).date()}) — today.html unchanged.")
        return
    _, url, title = res
    with open("today.html", "w") as f:
        f.write(redirect_html(url))
    print(f"wrote today.html -> {url}  (from: {title})")


if __name__ == "__main__":
    main()
