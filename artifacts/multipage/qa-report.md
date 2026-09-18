# Multipage Redesign QA Report

Date: 2026-09-18
Branch: `feat/multipage-brand-system`

## Scope

- Homepage structure and single-link header
- About Me rewrite from verified bio
- Blog visual redesign with editorial preservation
- Consultation rewrite around First Call
- Tools catalog redesign without formula changes
- Local Barlow design system and article reading shell

## Blog editorial preservation

Compared all 42 active article pages and one redirect against `main` using parsed text and metadata.

Preserved fields:

- page title
- meta description
- canonical URL
- H1
- complete article body
- editorial CTA
- related-article content
- redirect destination

Result: **0 differences**.

The existing Blog listing heading, intro, filter labels, article titles, excerpts, dates, reading times, and CTAs are retained. The redesign changes layout and rendering safety only.

## Automated tests

- Python: **39 passed**
- JavaScript: **44 passed**
- `git diff --check`: passed
- Static added-line scan: no hardcoded secrets, shell injection, eval/exec, unsafe pickle, or SQL-format matches

## Link and runtime checks

- 48 changed/relevant HTML files crawled
- 33 unique internal/external links checked
- Broken internal links: **0**
- Calendly First Call: **HTTP 200**
- Homepage, About, Blog, Consultation, Tools, and a representative article:
  - one H1 each
  - no horizontal overflow
  - no broken images
  - one Meta Pixel loader
  - no browser-console errors in checked sessions
- Consultation query test removed `email` before trackers and forwarded only `utm_source` to Calendly.
- Legacy `/tools.html` redirect removed `email`, preserved `utm_source` and `fbclid`, and loaded no tracker before redirect.
- Blog click tracking stores only a coarse host/path target; query parameters and fragments are removed.
- Blog keyboard test reached the skip link and filter buttons; category filter updated `aria-pressed` and rendered count.

## Screenshots

Desktop 1440×900:

- `artifacts/multipage/screenshots/home-desktop.png`
- `artifacts/multipage/screenshots/about-desktop.png`
- `artifacts/multipage/screenshots/consultation-desktop.png`
- `artifacts/multipage/screenshots/tools-desktop.png`

Mobile 390×844:

- `artifacts/multipage/screenshots/home-mobile.png`
- `artifacts/multipage/screenshots/blog-mobile.png`
- `artifacts/multipage/screenshots/consultation-mobile.png`

## Intentional safeguards

- Testimonials are **not published** because the repository does not contain proof of website-publication permission.
- Policy Review is shown only as a possible step after First Call, not as a parallel entry CTA.
- Individual tool formulas and assumptions are unchanged.
- Hosted Mayar checkout and product route behavior are unchanged.
- No new third-party package or script was added.

## Risks

- The PR touches all 42 active article shells. Editorial text was mechanically verified against `main`, but visual review after deployment should sample several long articles and one table-heavy article.
- `data/blog.json` remains an empty news source; `data/posts.json` remains the working static source. The renderer keeps static posts when the background API fails.

## Rollback

Revert the PR commit. No database, order, checkout, or external configuration migration is required.
