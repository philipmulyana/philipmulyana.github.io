# Homepage production implementation — QA evidence

## Scope

Replaces the temporary Coming Soon homepage with the approved clean-minimal black-stage homepage. No merge or deployment is included in this branch.

## Automated verification

- Python: 24 tests passed.
- JavaScript: 42 tests passed.
- `git diff --check`: passed.
- Homepage regression coverage includes:
  - exact approved hero headline and supporting text;
  - semantic structure and one H1;
  - local official brand assets and local Barlow fonts;
  - dynamic years from 2008 and 2014;
  - no invented course title or company proof;
  - one Meta Pixel loader and retained Microsoft Clarity loader;
  - URL query dan fragment dibersihkan dari PII, coupon, serta field asing sebelum Meta Pixel atau Microsoft Clarity dimuat;
  - UTM, placement, dan fbclid forwarding;
  - explicit exclusion of name, email, phone, WhatsApp, coupon, and unknown query fields.

## Browser QA

- Desktop screenshot: `after-desktop-1440x900.png`.
- Mobile screenshot: `after-mobile-390x844.png`.
- Previous live homepage: `before-live-1440x900.png`.
- Browser console: 0 JavaScript errors and 0 console messages.
- Horizontal overflow: none in the inspected desktop browser.
- Barlow 400 and 700: loaded successfully.
- Images: all loaded with valid natural dimensions.
- Dynamic proof values: 18, 12, 18, 12 in the 2026 browser.
- Keyboard focus: primary CTA receives a visible 3px outline.
- Primary CTA minimum height: 52px desktop; 54px mobile by CSS.
- All linked local destinations tested: HTTP 200.

## Contrast checks

- Official red `#CC0100` on white: 5.88:1.
- Gray `#606060` on white: 6.29:1.
- Hero supporting text `#C6C6C6` on black: 12.29:1.

## Known limitations intentionally kept out of this PR

- Company proof stays hidden until Philip supplies the verified company list, relationship type, official logos, and publication permission. No placeholder or invented company was shipped.
- Discovery Meeting and Protection Review route to distinct, safe homepage anchors. Booking CTAs are intentionally withheld until approved offer details and destinations are available.
- The public course destination keeps its existing legacy route. The unapproved course title is not displayed on the homepage.
- Client login/paywall is not implemented in this homepage-only branch.

## Rollback

Revert the single feature commit or close the PR without merging. The current production site remains unchanged until explicit merge/deploy approval.
