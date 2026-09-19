# Corporate logo carousel QA — 2026-09-19

## Visual evidence

- `corporate-390x844.png` — mobile one-row automatic carousel.
- `corporate-1440x900.png` — desktop three-row automatic carousel.
- `home-390x844.png` and `home-1440x900.png` — homepage static logo grid without arrows or Pause/Jeda.

## Browser verification

`browser-qa.json` records seven Chrome checks:

- Corporate at 390×844 and 1440×900;
- credentials at both sizes;
- homepage proof at both sizes;
- Corporate at 390×844 with `prefers-reduced-motion: reduce`.

Verified:

- 30 semantic Corporate brand items;
- one visual row on mobile and three visual rows on desktop;
- automatic transform changes over time;
- focus pauses the transform;
- the duplicated visual group is `aria-hidden` and has empty image alternatives;
- Reduced Motion has no running animation, no duplicate group, and a horizontally scrollable fallback;
- no broken visible image, carousel control, horizontal page overflow, or console error;
- 18 years, 10 years, and 50+ brand facts are present;
- homepage proof remains static and has no controls.

## Lighthouse mobile

Three sequential Lighthouse 13.5.0 runs are summarized in `performance.json`.

Median:

- Performance: 99
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- FCP: 1,364 ms
- LCP: 1,889 ms
- TBT: 0 ms
- CLS: 0.0001147559731588184
- Transfer: 143,780 bytes

Compared with the pre-logo Corporate baseline, transfer is 883 bytes lower, TBT and CLS are unchanged, and median LCP is 155 ms higher.
