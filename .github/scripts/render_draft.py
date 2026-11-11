#!/usr/bin/env python3
"""Render a local markdown draft (front matter: title, slug, meta_description, category) into /blog with the standard template and add it to posts.json.
Usage: python3 .github/scripts/render_draft.py . path/to/draft.md YYYY-MM-DD   (needs: pip install markdown)
Then run internal_links.py and generate_sitemap.py. Local pages are preserved by the daily Airtable publish (MERGE-PRESERVE)."""
import sys, re, json, pathlib, importlib.util
site = pathlib.Path(sys.argv[1]); draft = pathlib.Path(sys.argv[2])
spec = importlib.util.spec_from_file_location("pb", site/".github/scripts/publish_blogs.py")
pb = importlib.util.module_from_spec(spec); spec.loader.exec_module(pb)
raw = draft.read_text(encoding="utf-8")
fm, body = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S).groups()
meta = {k.strip(): v.strip().strip('"') for k, v in (l.split(":", 1) for l in fm.splitlines() if ":" in l)}
body = re.sub(r"^# .*\n+", "", body.strip(), count=1)  # H1 comes from template
post = {"Title": meta["title"], "Slug": meta["slug"], "Excerpt": meta["meta_description"],
        "Category": meta["category"], "CategoryLabel": "Artikel Kami", "Date": sys.argv[3],
        "ReadingTime": pb._reading_time(body), "Author": "Philip Mulyana", "Content": body}
posts = json.loads((site/"data/posts.json").read_text())["posts"]
others = [{"Slug": p["slug"], "Title": p["title"], "Category": p["category"], "CategoryLabel": p["categoryLabel"], "ReadingTime": p["readingTime"]} for p in posts]
(site/"blog"/f"{post['Slug']}.html").write_text(pb.render_page(post, others), encoding="utf-8")
entry = {"slug": post["Slug"], "title": post["Title"], "category": post["Category"], "categoryLabel": post["CategoryLabel"],
         "date": post["Date"], "excerpt": post["Excerpt"], "readingTime": post["ReadingTime"], "author": post["Author"]}
posts = [p for p in posts if p["slug"] != post["Slug"]] + [entry]
posts.sort(key=lambda x: x.get("date", ""), reverse=True)
(site/"data/posts.json").write_text(json.dumps({"posts": posts}, ensure_ascii=False, indent=2), encoding="utf-8")
print("rendered", post["Slug"], post["ReadingTime"])
