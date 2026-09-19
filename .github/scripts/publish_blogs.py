#!/usr/bin/env python3
"""
Blog publisher — runs in GitHub Actions daily (~07:40 WIB, before /today at 07:45).

Reads approved Airtable posts, renders each one into the shared production article
shell at /blog/{slug}.html, and regenerates data/posts.json. The workflow commits
any changes.

Runs FLAT in the site repo (repo root = site root), env from GitHub Actions:
  AIRTABLE_TOKEN (secret) · AIRTABLE_BASE_ID (default Website Builder) · AIRTABLE_BLOG_TABLE

MERGE-PRESERVE: posts.json keeps existing entries whose HTML still exists but isn't in
Airtable (local-render blogs never drop from the listing).
"""
import json, re, os, time, urllib.request, urllib.parse, pathlib, html as _html, socket, datetime
import markdown as md

socket.setdefaulttimeout(30)

SITE = pathlib.Path(__file__).resolve().parents[2]   # .github/scripts/ -> repo root
BLOG = SITE / "blog"
POSTS_JSON = SITE / "data" / "posts.json"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

CATEGORY_LABELS = {
    "insurance": "Insurance", "investment": "Investment",
    "personal_finance": "Personal Finance", "economy": "Economy",
}
MONTHS_ID = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
             "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def blog_output_path(slug):
    """Return a blog output path only for canonical, traversal-safe slugs."""
    value = str(slug or "")
    if not SLUG_PATTERN.fullmatch(value):
        raise ValueError(f"Unsafe blog slug: {value!r}")
    output = (BLOG / f"{value}.html").resolve()
    if output.parent != BLOG.resolve():
        raise ValueError(f"Blog slug escapes output directory: {value!r}")
    return output

def fmt_date(s):
    try:
        y, m, d = s.split("-")
        return f"{int(d)} {MONTHS_ID[int(m)]} {y}"
    except Exception:
        return s


def _json_ld(data):
    """Serialize JSON-LD without allowing source text to close the script tag."""
    return (json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            .replace("&", "\\u0026")
            .replace("<", "\\u003c")
            .replace(">", "\\u003e"))


def seo_head(post):
    """Return source-backed social metadata and dated BlogPosting schema."""
    title = str(post.get("Title", ""))
    description = str(post.get("Excerpt", ""))
    slug = str(post.get("Slug", ""))
    published = str(post.get("Date", "")).strip()
    author_name = str(post.get("Author") or "Philip Mulyana")
    canonical = f"https://philipmulyana.com/blog/{slug}.html"

    lines = [
        '    <meta property="og:type" content="article">',
        '    <meta property="og:locale" content="id_ID">',
        f'    <meta property="og:title" content="{_html.escape(title, quote=True)}">',
        f'    <meta property="og:description" content="{_html.escape(description, quote=True)}">',
        f'    <meta property="og:url" content="{_html.escape(canonical, quote=True)}">',
        '    <meta name="twitter:card" content="summary">',
        f'    <meta name="twitter:title" content="{_html.escape(title, quote=True)}">',
        f'    <meta name="twitter:description" content="{_html.escape(description, quote=True)}">',
    ]
    if not published:
        return "\n".join(lines)

    lines.append(f'    <meta property="article:published_time" content="{_html.escape(published, quote=True)}">')
    author = {"@type": "Person", "name": author_name}
    if author_name == "Philip Mulyana":
        author.update({
            "@id": "https://philipmulyana.com/#person",
            "url": "https://philipmulyana.com/about.html",
        })
    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "datePublished": published,
        "inLanguage": "id-ID",
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "author": author,
        "publisher": {"@id": "https://philipmulyana.com/#person"},
    }
    lines.extend([
        '    <script type="application/ld+json">',
        f'    {_json_ld(schema)}',
        '    </script>',
    ])
    return "\n".join(lines)


# Content Machine "Blogs" authoring table (Content Strategist base) — second source.
# A blog here with Status "4 - Writing Approved" publishes directly, no manual sync.
CM_BASE = "appqIkiQc23r9UU2T"
CM_TABLE = "tblZUarT6cG2qIPdY"
CM_APPROVED = "4 - Writing Approved"
CM_PUBLISHED = "5 - Published"
# Render set includes BOTH: status 4 = approved-and-publishing-now, status 5 = already
# live (kept in the set so promoting 4→5 never drops the page). After a status-4 blog
# renders, main() promotes it to "5 - Published" + stamps Published URL (write-back).
TOOL_KEYS = ("tool-retirement.html", "tool-education.html", "tool-proteksi.html", "financial-checkup.html")


def _airtable_all(base, table, token):
    recs, off = [], None
    while True:
        u = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}?pageSize=100" + (f"&offset={off}" if off else "")
        d = None
        for attempt in range(5):
            try:
                d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"Authorization": f"Bearer {token}"})))
                break
            except Exception as e:
                if attempt == 4:
                    raise
                print(f"  ...Airtable read retry {attempt+1}/5 ({e})")
                time.sleep(3 * (attempt + 1))
        recs += d["records"]; off = d.get("offset")
        if not off:
            break
    return recs


def _airtable_patch(base, table, rid, fields, token):
    u = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}/{rid}"
    data = json.dumps({"fields": fields}).encode()
    req = urllib.request.Request(u, data=data, method="PATCH",
                                 headers={"Authorization": f"Bearer {token}",
                                          "Content-Type": "application/json"})
    urllib.request.urlopen(req)


def _excerpt_from_body(body):
    txt = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", body or "")
    for line in txt.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("<!--"):
            return (line[:157] + "...") if len(line) > 160 else line
    return ""


def _reading_time(body):
    return f"{max(2, round(len((body or '').split()) / 200))} menit baca"


def _cm_content(body):
    """Keep approved Content Machine links intact in the shared article shell."""
    return body or ""


def fetch_posts():
    T = os.environ["AIRTABLE_TOKEN"]
    # 2026-07-23: default base corrected from appKuGZUI8tK4as7n (stale/inaccessible
    # to the shared token — base likely recreated) to appsyVRgcb35KuTFe (AI Content
    # Strategist), which holds the "Blog Posts" table and IS accessible. Token
    # unchanged; only the base ID was stale. Old Website Builder blogs stay live as
    # static files via the posts.json merge-preserve below.
    B = os.environ.get("AIRTABLE_BASE_ID", "appsyVRgcb35KuTFe")
    TB = os.environ.get("AIRTABLE_BLOG_TABLE", "Blog Posts")
    today = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)).strftime("%Y-%m-%d")

    # Source 1: Website Builder "Blog Posts" (Approved checkbox).
    # TOLERANT (2026-07-23): the shared Airtable token lost access to the Website
    # Builder base (403). Don't let that kill the whole publish — those blogs are
    # already rendered on disk and preserved via the posts.json merge below. Just
    # skip re-fetching them so Content Machine blogs (incl. today's) still publish.
    try:
        posts = [r["fields"] for r in _airtable_all(B, TB, T)
                 if r["fields"].get("Approved") and r["fields"].get("Slug")]
    except Exception as e:
        print(f"  WARNING: Website Builder base read failed ({e}); "
              f"keeping existing rendered blogs via posts.json merge-preserve.")
        posts = []
    seen = {p.get("Slug") for p in posts}

    # Source 2: Content Machine "Blogs" (Status 4 = publishing now, or 5 = already live).
    for r in _airtable_all(CM_BASE, CM_TABLE, T):
        f = r["fields"]
        if f.get("Status") not in (CM_APPROVED, CM_PUBLISHED) or not f.get("Slug") or not f.get("Body") or f["Slug"] in seen:
            continue
        seen.add(f["Slug"])
        body = f["Body"]
        posts.append({
            "Title": f.get("Title", ""),
            "Slug": f["Slug"],
            "Content": _cm_content(body),
            "Excerpt": f.get("Excerpt") or _excerpt_from_body(body),
            "ReadingTime": _reading_time(body),
            "Category": "personal_finance",
            "CategoryLabel": "Artikel Kami",
            "Author": "Philip Mulyana",
            "Date": f.get("Publish Date", ""),
            "_cm_id": r["id"],           # for status write-back in main()
            "_cm_status": f.get("Status"),
        })

    # Date-gate: future-dated posts wait until their publish date (WIB).
    posts = [p for p in posts if not p.get("Date") or p.get("Date") <= today]
    posts.sort(key=lambda f: f.get("Date", ""), reverse=True)
    return posts


def render_body(content_md):
    return md.markdown(content_md or "", extensions=["tables", "fenced_code", "sane_lists"])


def baca_juga(post, all_posts):
    others = [p for p in all_posts if p.get("Slug") != post.get("Slug")][:2]
    cards = []
    for other in others:
        category = other.get("Category", "")
        type_badge = "Berita Keuangan" if other.get("CategoryLabel") == "News Insight" else "Artikel Kami"
        topic = CATEGORY_LABELS.get(category, other.get("CategoryLabel", ""))
        cards.append(f'''        <a href="/blog/{_html.escape(str(other.get("Slug", "")), quote=True)}.html">
          <span>{_html.escape(str(type_badge))} · {_html.escape(str(topic or ""))}</span>
          <h3>{_html.escape(str(other.get("Title", "")))}</h3>
          <p>{_html.escape(str(other.get("ReadingTime", "")))}</p>
        </a>''')
    return "\n".join(cards)


def render_page(post, all_posts):
    title = str(post.get("Title", ""))
    slug = str(post.get("Slug", ""))
    blog_output_path(slug)
    description = str(post.get("Excerpt", ""))
    cat = post.get("Category", "")
    type_badge = "Berita Keuangan" if post.get("CategoryLabel") == "News Insight" else "Artikel Kami"
    topic = CATEGORY_LABELS.get(cat, post.get("CategoryLabel", ""))
    meta_parts = [fmt_date(str(post.get("Date", ""))), str(post.get("ReadingTime", "")), str(post.get("Author") or "Philip Mulyana")]
    article_meta = " · ".join(_html.escape(value) for value in meta_parts if value)
    return f'''<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{_html.escape(title)} — Philip Mulyana</title>
  <meta name="description" content="{_html.escape(description, quote=True)}">
  <link rel="canonical" href="https://philipmulyana.com/blog/{_html.escape(slug, quote=True)}.html">
{seo_head(post)}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preload" href="/assets/homepage/fonts/barlow-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/homepage/fonts/barlow-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/site/site.css">
  <link rel="stylesheet" href="/assets/site/article.css">
  <script src="/js/sanitize-attribution.js"></script>
  <script src="/js/pixel.js"></script>
  <script>(function(c,l,a,r,i,t,y){{c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)}})(window,document,"clarity","script","wjulbbpfmx");</script>
</head>
<body>
  <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
  <header class="site-header">
    <div class="container navigation">
      <a class="brand" href="/" aria-label="Philip Mulyana — Homepage"><img src="/assets/homepage/logo-white.png" alt="Philip Mulyana" width="1443" height="1181"></a>
      <nav aria-label="Navigasi utama"><a href="/consultation.html">Konsultasi Asuransi</a></nav>
    </div>
  </header>
  <main id="main-content">
    <header class="article-hero">
      <div class="container-reading">
        <a class="article-back" href="/blog.html">← Blog</a>
        <div class="article-kicker">{_html.escape(type_badge)} · {_html.escape(str(topic or ""))}</div>
        <h1>{_html.escape(title)}</h1>
        <div class="article-meta">{article_meta}</div>
      </div>
    </header>
    <article class="article-layout">
      <div class="container-reading article-content">
{render_body(str(post.get("Content", "")))}
      </div>
    </article>
    <section class="article-cta" aria-labelledby="article-consultation-heading">
      <div>
        <span class="eyebrow">Konsultasi Asuransi</span>
        <p id="article-consultation-heading">Ingin membahas situasimu lebih lanjut?</p>
        <div class="article-cta-copy">Pelajari lebih dulu cara Konsultasi Asuransi berjalan. First Call adalah langkah awal untuk mendengar situasimu dan melihat apakah layanan ini relevan sebelum masuk ke sesi berikutnya.</div>
        <a href="/consultation.html" data-forward-attribution>Pelajari Konsultasi Asuransi</a>
      </div>
    </section>
    <section class="article-related" aria-labelledby="related-heading">
      <div>
        <h2 id="related-heading">Baca Juga</h2>
        <div class="grid">
{baca_juga(post, all_posts)}
        </div>
      </div>
    </section>
  </main>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand"><img src="/assets/homepage/logo-white.png" alt="Philip Mulyana" width="1443" height="1181" loading="lazy"><p>Artikel tentang keputusan keuangan dalam kehidupan sehari-hari.</p></div>
      <div><h2>Belajar</h2><a href="/blog.html">Artikel</a><a href="/tools/">Tools</a><a href="/product/dana-kuliah/">Online Course</a></div>
      <div><h2>Konsultasi</h2><a href="/consultation.html">Konsultasi Asuransi</a><a href="https://calendly.com/philipmulyana/first-call" data-forward-attribution>First Call</a></div>
      <div><h2>Tentang</h2><a href="/about.html">Tentang Philip</a><a href="https://instagram.com/philipmulyana" target="_blank" rel="noopener noreferrer">Instagram</a><a href="/privacy-policy/">Kebijakan Privasi</a></div>
    </div>
  </footer>
  <script src="/js/blog-track.js" defer></script>
  <script src="/js/site.js" defer></script>
</body>
</html>
'''


def main():
    posts = fetch_posts()
    BLOG.mkdir(parents=True, exist_ok=True)
    safe_posts = []
    for p in posts:
        try:
            blog_output_path(p.get("Slug"))
        except ValueError as ex:
            print(f"  WARNING: skipping post with unsafe slug ({ex})")
            continue
        safe_posts.append(p)
    posts = safe_posts
    for p in posts:
        blog_output_path(p["Slug"]).write_text(render_page(p, posts), encoding="utf-8")
        print(f"  page: /blog/{p['Slug']}.html")

    # WRITE-BACK: a Content Machine blog rendered from status "4 - Writing Approved" is
    # now live → promote it to "5 - Published" + stamp Published URL so Airtable reflects
    # reality. Status 5 stays in the render set (see fetch_posts), so it never drops.
    # Resilient: a failed patch logs a warning but never blocks the publish/commit.
    T = os.environ["AIRTABLE_TOKEN"]
    for p in posts:
        if p.get("_cm_id") and p.get("_cm_status") == CM_APPROVED:
            live_url = f"https://philipmulyana.com/blog/{p['Slug']}.html"
            try:
                _airtable_patch(CM_BASE, CM_TABLE, p["_cm_id"],
                                {"Status": CM_PUBLISHED, "Published URL": live_url}, T)
                print(f"  promoted → 5 - Published: {p['Slug']}")
            except Exception as ex:
                print(f"  WARNING: status write-back failed for {p['Slug']}: {ex}")

    listing = [{"slug": p.get("Slug",""), "title": p.get("Title",""), "category": p.get("Category",""),
                "categoryLabel": p.get("CategoryLabel",""), "date": p.get("Date",""),
                "excerpt": p.get("Excerpt",""), "readingTime": p.get("ReadingTime",""),
                "author": p.get("Author","")} for p in posts]

    # MERGE-PRESERVE: keep existing posts.json entries whose HTML still exists but aren't in Airtable
    at_slugs = {p.get("Slug") for p in posts}
    if POSTS_JSON.exists():
        try:
            for e in json.load(open(POSTS_JSON)).get("posts", []):
                s = e.get("slug")
                if s and s not in at_slugs:
                    try:
                        existing_page = blog_output_path(s)
                    except ValueError:
                        print(f"  WARNING: skipped unsafe local slug: {s!r}")
                        continue
                    if existing_page.exists():
                        listing.append(e)
                        print(f"  preserved (local-render, not in Airtable): /blog/{s}.html")
        except Exception as ex:
            print("  (posts.json merge skipped:", ex, ")")
    listing.sort(key=lambda x: x.get("date", ""), reverse=True)

    POSTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    POSTS_JSON.write_text(json.dumps({"posts": listing}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(posts)} Airtable posts rendered · {len(listing)} total in posts.json")


if __name__ == "__main__":
    main()
