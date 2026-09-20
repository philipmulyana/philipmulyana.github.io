# Phase 3 Route and Canonical Cleanup Evidence

Local QA server: `http://127.0.0.1:8773`

The screenshots in this directory exercise legacy aliases after the redirect logic runs:

- `tool-education-mobile-390x844.png`: `/tool-education.html` redirected to `/tools/education/`.
- `tool-retirement-desktop-1440x900.png`: `/tool-retirement.html` redirected to `/tools/retirement/`.

## Verified behavior

- Safe `utm_*` attribution survives the redirect.
- Email, phone, and WhatsApp parameters are removed before redirecting.
- Redirects fail closed when the sanitizer does not complete.
- Redirect stubs are `noindex`, canonical, tracker-free, and do not chain.
- The legacy `post.html` router only accepts published canonical slugs; PII is removed from the address bar and never copied into the destination path.
- Distinct legacy/internal tools keep their original functionality and are marked `noindex, nofollow` instead of being redirected.
- Mobile 390×844 and desktop 1440×900 screenshots show no visible clipping or overlap.
- Browser QA found no horizontal overflow and no JavaScript errors.
- The duplicate `mk251.html` article keeps its unique formula definitions while using `noindex` plus a canonical link to the current article.
- Python suite: 85/85 passing.
- Node suite: 73/73 passing.
- Tracker guard: 66 real pages valid, 19 redirect stubs, 0 missing Pixel, 0 missing blog beacon.

The sitemap, hosted checkout destinations, active-page visible copy, and tracker source files were not changed.
