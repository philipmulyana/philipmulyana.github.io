#!/usr/bin/env python3
"""
/today redirect updater — runs in GitHub Actions daily at 00:00 WIB.

Points philipmulyana.com/today at the day's blog:
  1) If a blog-driver Story is scheduled to publish TODAY (WIB) and has a
     `Blog Target URL` -> use that blog.
  2) Else -> the LATEST published blog (newest entry in data/posts.json).
So /today always resolves to a real, current blog post (never an index / 404).
ManyChat holds the static /today URL forever; this re-points it each day.

Env: AIRTABLE_TOKEN (GitHub Actions secret). Writes today.html; workflow commits it.
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


def todays_story_blog():
    """Blog Target URL of the blog-driver story publishing today (WIB), or None."""
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


def latest_blog_path():
    """Path of the newest published blog from data/posts.json, or /blog.html fallback."""
    try:
        d = json.load(open("data/posts.json"))
        posts = d if isinstance(d, list) else d.get("posts", [])
        posts = sorted(posts, key=lambda p: (p.get("date") or p.get("Date") or ""), reverse=True)
        if posts:
            slug = posts[0].get("slug") or posts[0].get("Slug")
            if slug:
                return f"/blog/{slug}.html", (posts[0].get("title") or posts[0].get("Title") or slug)
    except Exception as e:
        print("posts.json fallback failed:", e)
    return "/blog.html", "blog index"


def redirect_html(path):
    return (
        '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">\n'
        "<title>Artikel Hari Ini…</title>\n"
        '<meta name="robots" content="noindex">\n'
        f'<link rel="canonical" href="https://philipmulyana.com{path}">\n'
        f'<meta http-equiv="refresh" content="0; url={path}">\n'
        f"<script>window.location.replace('{path}');</script>\n"
        f'</head><body>Menuju artikel hari ini… <a href="{path}">klik di sini kalau tidak otomatis</a>.</body></html>\n'
    )


def main():
    res = todays_story_blog()
    if res:
        _, url, title = res
        path = urllib.parse.urlparse(url).path
        src = f"story hari ini: {title}"
    else:
        path, title = latest_blog_path()
        src = f"blog terbaru (tidak ada story hari ini): {title}"

    with open("today.html", "w") as f:
        f.write(redirect_html(path))
    print(f"today.html -> {path}  [{src}]")


if __name__ == "__main__":
    main()
