#!/usr/bin/env python3
"""
Blog publisher — runs in GitHub Actions daily (~07:40 WIB, before /today at 07:45).

Ported from AI Website Builder/tools/generate_blog_static.py. Reads Airtable
"Blog Posts" (Website Builder base), renders every Approved post to /blog/{slug}.html
(self-contained: nav/footer/style inline, tool-CTA auto-injected), and regenerates
data/posts.json. The workflow commits any changes.

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

CATEGORY_COLORS = {
    "insurance": "bg-purple-100 text-purple-700",
    "investment": "bg-blue-100 text-blue-700",
    "personal_finance": "bg-green-100 text-green-700",
    "economy": "bg-orange-100 text-orange-700",
}
CATEGORY_LABELS = {
    "insurance": "Insurance", "investment": "Investment",
    "personal_finance": "Personal Finance", "economy": "Economy",
}
MONTHS_ID = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
             "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

NAV = '''    <nav class="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <a href="/index.html" class="text-lg font-bold tracking-tight text-black">PM</a>
                <div class="hidden md:flex items-center space-x-8">
                    <a href="/tools/" class="text-sm text-gray-500 hover:text-black transition-colors">Tools</a>
                    <a href="/blog.html" class="text-sm text-black font-medium">Blog</a>
                    <a href="/consultation.html" class="text-sm bg-black text-white px-5 py-2 rounded-full transition-colors">Consultation</a>
                </div>
                <div class="flex md:hidden items-center gap-3">
                    <a href="/consultation.html" class="text-xs bg-black text-white px-4 py-1.5 rounded-full font-medium">Book Now</a>
                    <button id="mobile-menu-btn" class="p-2 rounded-md hover:bg-gray-100" aria-label="Toggle menu">
                        <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                </div>
            </div>
        </div>
        <div id="mobile-menu" class="md:hidden hidden bg-white border-t border-gray-100">
            <div class="px-6 py-4 space-y-1">
                <a href="/tools/" class="block px-3 py-2 rounded-lg text-gray-500 hover:text-black">Tools</a>
                <a href="/blog.html" class="block px-3 py-2 rounded-lg text-black font-medium">Blog</a>
                <a href="/consultation.html" class="block px-3 py-2 rounded-lg text-gray-500 hover:text-black">Consultation</a>
            </div>
        </div>
    </nav>
    <script>
        document.getElementById('mobile-menu-btn')?.addEventListener('click', function () {
            document.getElementById('mobile-menu')?.classList.toggle('hidden');
        });
    </script>'''

FOOTER = '''    <footer class="bg-black text-white py-20 px-6">
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-800">
                <p class="text-gray-500 text-sm">&copy; 2026 Philip Mulyana</p>
                <div class="flex items-center space-x-6 mt-4 md:mt-0">
                    <a href="https://instagram.com/philipmulyana" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition-colors text-sm">Instagram</a>
                    <a href="/contact.html" class="text-gray-500 hover:text-white transition-colors text-sm">Contact</a>
                </div>
            </div>
        </div>
    </footer>'''

STYLE = '''    <style>
        .article-content p { color: #4b5563; line-height: 1.75; margin-bottom: 1rem; font-size: 1.0625rem; }
        .article-content h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #000; }
        .article-content h3 { font-size: 1.2rem; font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.75rem; color: #111827; }
        .article-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: #4b5563; }
        .article-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; color: #4b5563; }
        .article-content li { margin-bottom: 0.5rem; line-height: 1.75; font-size: 1.0625rem; }
        .article-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; margin: 1.5rem 0; color: #6b7280; font-style: italic; }
        .article-content strong { color: #111827; font-weight: 600; }
        .article-content a { color: #111827; text-decoration: underline; font-weight: 600; }
        .article-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.95rem; }
        .article-content th, .article-content td { border: 1px solid #e5e7eb; padding: 0.6rem 0.85rem; text-align: left; color: #4b5563; vertical-align: top; }
        .article-content th { background: #f9fafb; font-weight: 600; color: #111827; }
        .article-content td strong { color: #111827; }
    </style>'''


def fmt_date(s):
    try:
        y, m, d = s.split("-")
        return f"{int(d)} {MONTHS_ID[int(m)]} {y}"
    except Exception:
        return s


# Content Machine "Blogs" authoring table (Content Strategist base) — second source.
# A blog here with Status "4 - Writing Approved" publishes directly, no manual sync.
CM_BASE = "appqIkiQc23r9UU2T"
CM_TABLE = "tblZUarT6cG2qIPdY"
CM_APPROVED = "4 - Writing Approved"
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
    """Strip tool-CTA markdown links (auto-CTA injects styled buttons) but keep a
    marker comment so cta_block()/mid_cta() still detect the tool."""
    body = body or ""
    tool = next((k for k in TOOL_KEYS if k in body), None)
    body = re.sub(r"\[([^\]]+)\]\((https?://[^)]*(?:tool-retirement|tool-education|tool-proteksi|financial-checkup)[^)]*)\)", r"\1", body)
    if tool:
        body += f"\n\n<!-- {tool} -->"
    return body


def fetch_posts():
    T = os.environ["AIRTABLE_TOKEN"]
    B = os.environ.get("AIRTABLE_BASE_ID", "appKuGZUI8tK4as7n")
    TB = os.environ.get("AIRTABLE_BLOG_TABLE", "Blog Posts")
    today = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)).strftime("%Y-%m-%d")

    # Source 1: Website Builder "Blog Posts" (Approved checkbox)
    posts = [r["fields"] for r in _airtable_all(B, TB, T)
             if r["fields"].get("Approved") and r["fields"].get("Slug")]
    seen = {p.get("Slug") for p in posts}

    # Source 2: Content Machine "Blogs" (Status == Writing Approved)
    for r in _airtable_all(CM_BASE, CM_TABLE, T):
        f = r["fields"]
        if f.get("Status") != CM_APPROVED or not f.get("Slug") or not f.get("Body") or f["Slug"] in seen:
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
        })

    # Date-gate: future-dated posts wait until their publish date (WIB).
    posts = [p for p in posts if not p.get("Date") or p.get("Date") <= today]
    posts.sort(key=lambda f: f.get("Date", ""), reverse=True)
    return posts


def render_body(content_md):
    body = md.markdown(content_md or "", extensions=["tables", "fenced_code", "sane_lists"])
    body = re.sub(r"<p>", '<p class="text-lg text-gray-600 leading-relaxed">', body, count=1)
    return body


def baca_juga(post, all_posts):
    others = [p for p in all_posts if p.get("Slug") != post.get("Slug")][:2]
    cards = []
    for o in others:
        cat = o.get("Category", "")
        type_badge = "Berita Keuangan" if o.get("CategoryLabel") == "News Insight" else "Artikel Kami"
        topic = CATEGORY_LABELS.get(cat, o.get("CategoryLabel", ""))
        color = CATEGORY_COLORS.get(cat, "bg-gray-100 text-gray-700")
        cards.append(f'''                <a href="/blog/{o.get("Slug")}.html" class="bg-gray-50 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-300 block">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-black text-white">{type_badge}</span>
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full {color}">{topic}</span>
                    </div>
                    <h3 class="font-bold mt-1 leading-snug">{_html.escape(o.get("Title",""))}</h3>
                    <p class="text-sm text-gray-500 mt-2">{o.get("ReadingTime","")}</p>
                </a>''')
    return "\n".join(cards)


TOOL_CTA = {
    "tool-education.html": ("Hitung Dana Pendidikan Anak Kamu", "https://philipmulyana.com/tool-education.html"),
    "tool-retirement.html": ("Cek Gap Dana Pensiun Kamu", "https://philipmulyana.com/tool-retirement.html"),
    "tool-proteksi.html": ("Hitung Kebutuhan Proteksi Kamu", "https://philipmulyana.com/tool-proteksi.html"),
    "financial-checkup.html": ("Mulai Financial Check-up Gratis", "https://philipmulyana.com/financial-checkup.html"),
}


def cta_block(post):
    content = post.get("Content", "") or ""
    for key, (label, url) in TOOL_CTA.items():
        if key in content:
            return f'''    <!-- CTA -->
    <section class="px-6 pb-20">
        <div class="max-w-3xl mx-auto">
            <div class="bg-black text-white rounded-3xl p-8 md:p-10 text-center">
                <p class="text-2xl font-black mb-3">Cek angka kamu sendiri — gratis, 2 menit.</p>
                <p class="text-gray-300 text-sm mb-6 max-w-lg mx-auto">Jangan cuma baca. Lihat persis berapa yang kamu butuhkan dan berapa yang harus kamu sisihkan mulai sekarang — sebelum waktunya makin sempit.</p>
                <a href="{url}" class="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors">🧮 {label}</a>
            </div>
            <p class="text-center text-sm text-gray-400 mt-6">Ada pertanyaan? <a href="https://instagram.com/philipmulyana" target="_blank" rel="noopener noreferrer" class="text-black underline font-medium">DM saya di Instagram</a></p>
        </div>
    </section>'''
    return '''    <!-- CTA -->
    <section class="px-6 pb-20">
        <div class="max-w-3xl mx-auto text-center">
            <p class="text-xl font-bold mb-4">Ada pertanyaan tentang keuangan?</p>
            <a href="https://instagram.com/philipmulyana" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">DM Saya di Instagram</a>
        </div>
    </section>'''


def mid_cta(post):
    content = post.get("Content", "") or ""
    for key, (label, url) in TOOL_CTA.items():
        if key in content:
            return ('<div style="margin:2.5rem 0;padding:1.25rem 1.5rem;border:1px solid #e5e7eb;'
                    'border-radius:1rem;background:#f9fafb;display:flex;flex-wrap:wrap;align-items:center;'
                    'justify-content:space-between;gap:1rem;">'
                    '<span style="font-size:0.95rem;font-weight:600;color:#111827;">Mau langsung tahu angka kamu sendiri?</span>'
                    f'<a href="{url}" style="text-decoration:none;white-space:nowrap;background:#000;color:#fff;'
                    f'padding:0.6rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:700;">&#129518; {label}</a>'
                    '</div>')
    return ""


def inject_mid_cta(body_html, post):
    cta = mid_cta(post)
    if not cta:
        return body_html
    positions = [m.start() for m in re.finditer(r"<h2", body_html)]
    if len(positions) < 2:
        return body_html
    mid = positions[len(positions) // 2]
    return body_html[:mid] + cta + "\n" + body_html[mid:]


def render_page(post, all_posts):
    title = post.get("Title", "")
    cat = post.get("Category", "")
    type_badge = "Berita Keuangan" if post.get("CategoryLabel") == "News Insight" else "Artikel Kami"
    topic = CATEGORY_LABELS.get(cat, post.get("CategoryLabel", ""))
    color = CATEGORY_COLORS.get(cat, "bg-gray-100 text-gray-700")
    return f'''<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{_html.escape(title)} — Philip Mulyana</title>
    <meta name="description" content="{_html.escape(post.get("Excerpt",""))}">
    <link rel="canonical" href="https://philipmulyana.com/blog/{post.get("Slug")}.html">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="/js/pixel.js"></script>
    <script>
        tailwind.config = {{ theme: {{ extend: {{ fontFamily: {{ sans: ['Inter', 'system-ui', 'sans-serif'] }} }} }} }}
    </script>
{STYLE}
</head>
<body class="bg-white text-black font-sans antialiased">

{NAV}

    <!-- Breadcrumb + Header -->
    <section class="pt-28 pb-8 px-6">
        <div class="max-w-3xl mx-auto">
            <a href="/blog.html" class="inline-flex items-center text-sm text-gray-400 hover:text-black transition-colors mb-6">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Blog
            </a>
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-black text-white">{type_badge}</span>
                <span class="text-xs font-medium px-2.5 py-1 rounded-full {color}">{topic}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-black leading-tight">{_html.escape(title)}</h1>
            <div class="flex items-center gap-3 mt-4 text-sm text-gray-400">
                <span>{fmt_date(post.get("Date",""))}</span>
                <span>&middot;</span>
                <span>{post.get("ReadingTime","")}</span>
                <span>&middot;</span>
                <span>{_html.escape(post.get("Author","Philip Mulyana"))}</span>
            </div>
        </div>
    </section>

    <!-- Article Content -->
    <section class="px-6 pb-8">
        <div class="max-w-3xl mx-auto article-content">
{inject_mid_cta(render_body(post.get("Content","")), post)}
        </div>
    </section>

{cta_block(post)}

    <!-- Baca Juga -->
    <section class="px-6 pb-16">
        <div class="max-w-3xl mx-auto">
            <h2 class="text-xl font-bold mb-6">Baca Juga</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
{baca_juga(post, all_posts)}
            </div>
        </div>
    </section>

{FOOTER}
</body>
</html>
'''


def main():
    posts = fetch_posts()
    BLOG.mkdir(parents=True, exist_ok=True)
    for p in posts:
        (BLOG / f"{p['Slug']}.html").write_text(render_page(p, posts), encoding="utf-8")
        print(f"  page: /blog/{p['Slug']}.html")

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
                if s and s not in at_slugs and (BLOG / f"{s}.html").exists():
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
