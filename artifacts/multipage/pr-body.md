## Ringkasan

- menyusun ulang homepage menjadi Hero → pengalaman/kredensial → Artikel Terbaru → Online Course → First Call → Tentang Philip
- menyederhanakan header menjadi logo + Konsultasi
- mengganti entry consultation menjadi First Call dan menempatkan Policy Review hanya sebagai kemungkinan tahap lanjut
- menampilkan tiga testimonial konsultasi existing secara verbatim dekat First Call dengan label “Pengalaman berdiskusi dengan Philip”
- membuat ulang About dan Konsultasi berdasarkan brief/copy terverifikasi
- redesign katalog Tools tanpa mengubah formula enam tool
- redesign Blog dan 42 reading shells tanpa mengubah copy editorial, CTA, URL, atau canonical
- menambah local Barlow design system, safe attribution forwarding, dan regression tests

## Batasan yang sengaja dijaga

- Testimonial tidak ditulis ulang dan tidak diklaim sebagai pengalaman First Call; izin publikasi dikelola oleh pemilik website.
- Blog hanya berubah secara visual/teknis. Perbandingan otomatis terhadap `main` menemukan 0 perbedaan editorial pada 42 artikel aktif.
- Individual tool formulas/assumptions tidak berubah.
- Mayar checkout dan entitlement flow tidak berubah.
- Tidak ada dependency atau script pihak ketiga baru.

## Verifikasi

- [x] 39 Python tests passed
- [x] 44 JavaScript tests passed
- [x] `git diff --check`
- [x] 48 relevant HTML files / 33 unique links / 0 broken internal links
- [x] Calendly First Call returned HTTP 200
- [x] 1440×900 desktop screenshots
- [x] 390×844 mobile screenshots
- [x] testimonial screenshots at 1440px and 390px with no clipping or overlap
- [x] no horizontal overflow on checked routes
- [x] one H1, no broken images, one Meta Pixel loader on checked routes
- [x] browser console: no JavaScript errors
- [x] keyboard reached skip link and Blog filter buttons
- [x] Blog category filter updates `aria-pressed` and result count
- [x] PII query removed before trackers; only allowlisted attribution forwarded
- [x] `/tools.html` compatibility redirect strips PII and keeps safe attribution

## Evidence

See `artifacts/multipage/qa-report.md` and screenshots in `artifacts/multipage/screenshots/`.

## Risk

The PR touches all 42 article shells. Text and metadata are mechanically verified unchanged, but post-deploy smoke testing should sample several long articles and one table-heavy article.

## Rollback

Revert the PR commit. No database, checkout, order, or external-service migration is involved.

## Merge/deploy

Do not merge or deploy until Philip gives explicit new approval.
