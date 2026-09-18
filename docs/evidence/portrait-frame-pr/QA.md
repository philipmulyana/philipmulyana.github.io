# Portrait frame balance QA

## Scope

- Changed the portrait panel background from light gray to black so `object-fit: contain` letterboxing blends into the portrait instead of appearing as white side margins.
- Balanced the red L-shaped accent at 8px on the left and bottom.
- No copy, routing, tracking, checkout, or attribution behavior changed.

## Evidence

- Before mobile full frame: `before-mobile-full-390x1200.png`
- After mobile full frame: `after-mobile-full-390x1200.png`
- Before desktop full frame: `before-desktop-full-1440x1800.png`
- After desktop full frame: `after-desktop-full-1440x1800.png`

## Automated verification

- 25 Python tests passed.
- 42 JavaScript tests passed.
- `git diff --check` passed.

## Browser verification

- Mobile evidence viewport: 390×1200, showing the complete portrait and bottom accent.
- Desktop evidence viewport: 1440×1800, showing the complete portrait and bottom accent.
- Portrait background computed as `rgb(0, 0, 0)`.
- Left accent computed width: `8px`.
- Bottom accent computed height: `8px`.
- Portrait image loaded successfully.
- No horizontal overflow.
- Browser console: 0 errors.

## Delivery boundary

This branch is not merged or deployed. Merge and deployment require separate approval.
