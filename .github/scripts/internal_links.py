#!/usr/bin/env python3
"""Internal linking pass. Run AFTER any blog generator (idempotent).

1. Each /blog/{slug}.html: "Baca Juga" shows the 4 most related articles (by topic
   words in title + excerpt) instead of the same 2 newest posts, plus a box linking
   the matching free tool.
2. /blog.html: a static, crawlable list of every article (the JS list stays for
   visitors; Google gets real <a href> links).
3. Each /tools/{tool}/index.html: an "Artikel terkait" block linking its articles.

Everything lives between <!-- IL:... --> markers so re-runs replace, never duplicate.
"""
import html, json, pathlib, re

SITE = pathlib.Path(__file__).resolve().parents[2]
POSTS = json.loads((SITE / "data" / "posts.json").read_text(encoding="utf-8"))["posts"]

TOOLS = [  # (path, label, pitch, keyword regex)
    ("/tools/retirement/", "Kalkulator Dana Pensiun", "Hitung berapa dana pensiun yang kamu butuhkan.",
     r"pensiun|hari tua|jht|bpjs ketenagakerjaan"),
    ("/tools/education/", "Kalkulator Dana Kuliah Anak", "Hitung biaya kuliah anak dan tabungan bulanannya.",
     r"kuliah|pendidikan|sekolah|universitas|ukt"),
    ("/tools/proteksi/", "Cek Kebutuhan Asuransi", "Lihat proteksi mana yang perlu kamu siapkan duluan.",
     r"asuransi|proteksi|polis|premi|klaim|repricing|kesehatan|jiwa|rumah sakit|mk 251|mk251"),
    ("/tools/survival/", "Survival Test Keluarga", "Kalau gaji berhenti, keluarga bisa bertahan berapa lama?",
     r"dana darurat|darurat|phk|gaji|bonus|thr|boros|hemat|tabungan|uang jajan|pengeluaran|cicilan|utang|keluarga"),
    ("/tools/risk-profile/", "Kenali Profil Risikomu", "Cari tahu instrumen investasi yang cocok buatmu.",
     r"investasi|reksa ?dana|saham|deposito|emas|obligasi|crypto|kripto|bodong|bunga|inflasi|lps"),
]
STOP = set("dan yang di ke dari untuk ini itu kamu dengan atau ga gak tidak bisa jadi ada apa cara buat lebih biar karena saat kalau pada juga sudah masih akan harus dalam per persen".split())


def words(p):
    t = f"{p.get('title','')} {p.get('excerpt','')}".lower()
    return {w for w in re.findall(r"[a-z0-9]{4,}", t) if w not in STOP}


def tool_for(p):
    t = f"{p.get('title','')} {p.get('excerpt','')}".lower()
    best = max(TOOLS, key=lambda tl: len(re.findall(tl[3], t)))
    return best if re.search(best[3], t) else None


def related(p, n=4):
    w = words(p)
    tl = tool_for(p)
    scored = []
    for o in POSTS:
        if o["slug"] == p["slug"]:
            continue
        s = len(w & words(o)) + (2 if tl and tool_for(o) == tl else 0)
        scored.append((s, o.get("date", ""), o))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [o for _, _, o in scored[:n]]


def put(src, name, block, anchor_before=None, anchor_regex=None):
    """Replace marker block, or insert it before an anchor the first time."""
    start, end = f"<!-- IL:{name} -->", f"<!-- /IL:{name} -->"
    full = f"{start}\n{block}\n{end}"
    if start in src:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: full, src, flags=re.S)
    if anchor_regex:
        m = re.search(anchor_regex, src, re.S)
        if m:
            return src[:m.start()] + full + "\n" + src[m.start():]
    if anchor_before and anchor_before in src:
        return src.replace(anchor_before, full + "\n" + anchor_before, 1)
    return src


def card(o):
    badge = "Berita Keuangan" if o.get("categoryLabel") == "News Insight" else "Artikel Kami"
    return (f'        <a href="/blog/{html.escape(o["slug"], True)}.html">\n'
            f'          <span>{badge}</span>\n'
            f'          <h3>{html.escape(o.get("title",""))}</h3>\n'
            f'          <p>{html.escape(o.get("readingTime",""))}</p>\n        </a>')


def tool_box(tl):
    path, label, pitch, _ = tl
    return (f'    <section class="article-related" aria-label="Tool gratis terkait"><div>'
            f'<span class="eyebrow">Tool gratis</span>'
            f'<h2 style="margin:8px 0 8px">{html.escape(label)}</h2>'
            f'<p style="margin:0 0 14px">{html.escape(pitch)}</p>'
            f'<a href="{path}" style="font-weight:700">Coba {html.escape(label)} →</a></div></section>')


def do_articles():
    n = 0
    for p in POSTS:
        f = SITE / "blog" / f"{p['slug']}.html"
        if not f.exists():
            continue
        s = o = f.read_text(encoding="utf-8")
        cards = "\n".join(card(r) for r in related(p))
        if "<!-- IL:related -->" not in s:  # first run: swap the generator's grid content for markers
            s = re.sub(r'(<h2 id="related-heading">Baca Juga</h2>\s*<div class="grid">).*?(\n\s*</div>\s*</div>\s*</section>)',
                       lambda m: m.group(1) + "\n<!-- IL:related -->\n<!-- /IL:related -->" + m.group(2), s, count=1, flags=re.S)
        s = put(s, "related", cards)
        tl = tool_for(p)
        s = put(s, "tool", tool_box(tl) if tl else "", anchor_regex=r'\s*<section class="article-related" aria-labelledby')
        if s != o:
            f.write_text(s, encoding="utf-8"); n += 1
    return n


def do_blog_index():
    f = SITE / "blog.html"
    s = f.read_text(encoding="utf-8")
    items = "\n".join(f'      <li><a href="/blog/{html.escape(p["slug"], True)}.html">{html.escape(p.get("title",""))}</a></li>'
                      for p in POSTS)
    block = (f'    <section class="container" aria-labelledby="all-posts-heading" style="padding:48px 0">\n'
             f'      <h2 id="all-posts-heading">Semua artikel</h2>\n      <ul style="columns:2 320px;line-height:1.6">\n{items}\n      </ul>\n    </section>')
    new = put(s, "all-posts", block, anchor_before="  </main>")
    if new != s:
        f.write_text(new, encoding="utf-8"); return 1
    return 0


def do_tools():
    n = 0
    for path, label, _, rx in TOOLS:
        f = SITE / path.strip("/") / "index.html"
        if not f.exists():
            continue
        s = f.read_text(encoding="utf-8")
        arts = [p for p in POSTS if tool_for(p) and tool_for(p)[0] == path][:6]
        if not arts:
            continue
        items = "\n".join(f'    <li><a href="/blog/{html.escape(p["slug"], True)}.html">{html.escape(p.get("title",""))}</a></li>' for p in arts)
        block = (f'<section aria-labelledby="il-related-heading" style="max-width:760px;margin:48px auto;padding:0 16px">\n'
                 f'  <h2 id="il-related-heading" style="font-size:22px">Baca juga: artikel terkait</h2>\n  <ul style="line-height:1.7">\n{items}\n  </ul>\n</section>')
        new = put(s, "tool-articles", block, anchor_regex=r"<footer|</body>")
        if new != s:
            f.write_text(new, encoding="utf-8"); n += 1
    return n


# In-text links: first match of each phrase in the article body, max 3 per post, never self.
# Specific phrases first so generic ones don't eat the slots.
INLINE = [
    (r"pre-existing|penyakit bawaan", "pre-existing-condition-asuransi"),
    (r"masa tunggu", "masa-tunggu-asuransi-kesehatan"),
    (r"nilai tunai", "nilai-tunai-asuransi"),
    (r"polis lapse|lapse", "polis-lapse"),
    (r"cuti premi", "cuti-premi-adalah"),
    (r"free look", "free-look-period-adalah"),
    (r"co-payment", "katanya-co-payment-itu-wajib"),
    (r"repricing|premi naik", "repricing-asuransi-kesehatan-premi-naik"),
    (r"klaim ditolak", "klaim-asuransi-jiwa-ditolak"),
    (r"\bJHT\b", "jht-kapan-bisa-dicairkan"),
    (r"jaminan pensiun", "jaminan-pensiun-bpjs-dapat-berapa"),
    (r"dana darurat", "kenapa-butuh-dana-darurat"),
    (r"dana pensiun|pensiun nyaman", "cara-hitung-dana-pensiun-yang-cukup"),
    (r"asuransi jiwa", "asuransi-jiwa-101"),
    (r"menunggu sisa", "kalau-dana-buat-kamu-selalu-menunggu-sisa"),
    (r"sulit dibatalkan", "tidak-semua-keinginan-perlu-dipikirkan-seperti-keputusan-seumur-hidup"),
]
IL_A = re.compile(r'<a class="il-inline" href="[^"]*">(.*?)</a>', re.S)


def inline_links(body, slug, cap=3):
    body = IL_A.sub(r"\1", body)  # re-runs start clean
    parts = re.split(r"(<[^>]+>)", body)
    skip, used, n = 0, set(), 0
    for i, part in enumerate(parts):
        if part.startswith("<"):
            m = re.match(r"<(/?)(a|h[1-6])\b", part, re.I)
            if m:
                skip += -1 if m.group(1) else 1
            continue
        if skip or n >= cap or not part.strip():
            continue
        for rx, target in INLINE:
            if n >= cap or target == slug or target in used:
                continue
            m = re.search(rx, part, re.I)
            if m:
                a = f'<a class="il-inline" href="/blog/{target}.html">{m.group(0)}</a>'
                part = part[:m.start()] + a + part[m.end():]
                used.add(target); n += 1
                break  # one link per text node keeps offsets simple
        parts[i] = part
    return "".join(parts)


def do_inline():
    n = 0
    for p in POSTS:
        f = SITE / "blog" / f"{p['slug']}.html"
        if not f.exists():
            continue
        s = f.read_text(encoding="utf-8")
        m = re.search(r"(<article\b[^>]*>)(.*?)(</article>)", s, re.S)
        if not m:
            continue
        new = s[:m.start(2)] + inline_links(m.group(2), p["slug"]) + s[m.end(2):]
        if new != s:
            f.write_text(new, encoding="utf-8"); n += 1
    return n


if __name__ == "__main__":
    print(f"articles updated: {do_articles()}, blog index: {do_blog_index()}, tools: {do_tools()}, inline: {do_inline()}")
