# Phase 2A SEO and performance evidence

## Measurement method

- Lighthouse CLI against the repository served locally over HTTP.
- Three runs per page and profile; tables use the median.
- Meta Pixel and Microsoft Clarity requests were blocked during measurement to avoid synthetic tracking events.
- These are controlled lab measurements, not production field data. Production must be checked again after an approved deployment.

## Six-page baseline

| Page | Mobile score | Mobile LCP | Mobile TBT | Mobile CLS | Desktop score |
|---|---:|---:|---:|---:|---:|
| Homepage | 97 | 2.50 s | 0 ms | 0.0003 | 100 |
| Dana Kuliah | 79 | 4.35 s | 0 ms | 0.0151 | 99 |
| Blog | 96 | 2.11 s | 0 ms | 0.1062 | 100 |
| Tools | 99 | 1.96 s | 0 ms | 0.0003 | 100 |
| Consultation | 99 | 2.11 s | 0 ms | 0.0003 | 100 |
| About | 99 | 2.04 s | 0 ms | 0.0003 | 100 |

## Evidence-based fixes

Only the two measured bottlenecks were changed.

| Page | Metric | Before median | After median |
|---|---|---:|---:|
| Dana Kuliah mobile | Performance | 79 | 92 |
| Dana Kuliah mobile | LCP | 4.35 s | 3.24 s |
| Dana Kuliah mobile | CLS | 0.0151 | 0 |
| Blog mobile | Performance | 96 | 99 |
| Blog mobile | CLS | 0.1062 | 0.0243 |
| Dana Kuliah desktop | Performance | 99 | 100 |
| Blog desktop | Performance | 100 | 100 |

Dana Kuliah now reuses the existing Barlow WOFF2 files instead of local TTF files and preloads the hero weights. Blog preloads the Barlow 600 weight used by its filter controls.

## Visual QA

- `blog-mobile-390x844.png`: no clipping or overlap; filter controls wrap cleanly.
- `dana-kuliah-mobile-390x844.png`: Barlow renders correctly; the hero CTA is visible and unobstructed.
- Desktop browser QA: no horizontal overflow and no console errors on either page.
- Dana Kuliah: four purchase CTAs still point to the existing Mayar checkout.

## SEO checks

- Description and Open Graph text metadata: 49/49 sitemap URLs.
- Twitter/X summary card metadata: 49/49 sitemap URLs.
- Homepage JSON-LD: `Person` and `WebSite` only.
- Dated articles with source-backed `BlogPosting` JSON-LD: 39.
- Legacy articles without a source date: 3; no date or article schema was invented.
- Existing blog article bodies, visible copy, and CTA destinations are unchanged.
