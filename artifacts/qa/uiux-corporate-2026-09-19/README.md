# UI/UX + Corporate implementation QA — 2026-09-19

This folder contains review evidence for `feat/uiux-corporate-page`. It is not proof of deployment; all “after” captures are from the local feature branch.

## Visual comparisons

| Area | Before | After |
|---|---|---|
| Legacy article shell | [`article-before-mobile.png`](article-before-mobile.png) | [`article-after-mobile.png`](article-after-mobile.png) |
| Consultation first viewport | [`consultation-before-mobile.png`](consultation-before-mobile.png) | [`consultation-after-mobile.png`](consultation-after-mobile.png) |
| Homepage testimonial scale | [`testimonial-before-mobile.png`](testimonial-before-mobile.png) | [`testimonial-after-mobile.png`](testimonial-after-mobile.png) |
| Corporate rough concept → production implementation | [`corporate-concept-before-mobile.png`](corporate-concept-before-mobile.png) | [`corporate-after-mobile.png`](corporate-after-mobile.png) |

Corporate desktop: [`corporate-after-desktop.png`](corporate-after-desktop.png)

Corporate Reduced Motion proof grid: [`corporate-proof-reduced-motion-mobile.png`](corporate-proof-reduced-motion-mobile.png)

Corporate collaboration destination (mobile): [`links-collaboration-mobile.png`](links-collaboration-mobile.png)

## Browser QA

Tested at 390×844 and 1440×900 across homepage, About, Consultation, Blog, representative article, Tools, Links, and Corporate.

- No horizontal overflow in 16 viewport runs.
- No browser-console errors in 16 viewport runs.
- Corporate CTA: visible in the first viewport on mobile and desktop.
- Corporate H1: 43px / 4 lines mobile; 77.76px / 4 lines desktop.
- Homepage testimonial: 20px / 27px mobile; 28px / 37.8px desktop.
- Blog: 12 of 42 articles initially; “Muat lebih banyak” reveals the next 12.
- Keyboard: 8 pages, no missing focus indicator on interactive elements.
- Contrast: 554 sampled text elements, 0 WCAG contrast failures.
- Reduced Motion: carousel animation disabled, controls hidden, one static grid visible, no overflow.
- Corporate Lighthouse mobile (3 runs): score 100; LCP 1.73–1.74s; TBT 0ms; transfer 145 KB. Before optimization: score 61–67; LCP 3.90–5.59s; TBT 740–912ms.

Raw evidence:

- [`metrics.json`](metrics.json)
- [`contrast.json`](contrast.json)
- [`keyboard.json`](keyboard.json)
- [`reduced-motion.json`](reduced-motion.json)
- [`performance.json`](performance.json)

## Automated gates

- `python3 -m pytest tests -q`: 62 passed, 99 subtests passed.
- `node --test tests/*.test.js`: 61 passed.
- Tracker guard: 85 HTML files checked; 0 tracker errors.
- HTML parse: 94 files; 0 parse errors.
- Article editorial comparator: 42 articles; 0 differences in title, canonical, H1, or visible editorial text ([raw result](article-editorial-integrity.json)).
- Corporate proof: 30 typographic brand names; 0 third-party logo artwork or runtime hotlinks.
- Attribution privacy: source/medium/placement use controlled taxonomies; campaign/content/term require namespaced hex machine IDs (`cmp_`, `ad_`, `kw_`), while fbclid must match a long `IwAR...` token. Free-text attribution values are dropped.
- Duplicate ID scan: 94 HTML files; 0 duplicate IDs.

## Brand-use note

All 30 entries intentionally use neutral Barlow text rather than official logo artwork. Official marks can be added only after reuse permission or another documented legal basis is available and current assets are re-verified. Full reasoning is in `assets/partners/corporate/PROVENANCE.md`.
