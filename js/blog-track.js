/* ============================================================
   blog-track.js — anonymous funnel beacon for blog articles
   Reuses the calc funnel infra (Modal gateway -> Google Sheet).

   Fires:
     • blog_view   on page load  -> "Blog Views" tab
     • blog_click  on CTA click   -> "Blog Clicks" tab
        (any <a> pointing to a calculator / calendly / financial-checkup /
         consultation — the blog -> kalkulator -> daftar konsultasi bridge)

   Privacy: no visitor identity, no cookies. Only slug + referrer host +
   coarse target. Fire-and-forget, keepalive, non-blocking. Zero UX impact.

   Ships with: PM Second Brain funnel instrumentation build (2026-07-22).
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';

  // slug = last path segment without extension (e.g. /blog/asuransi-jiwa-101.html -> asuransi-jiwa-101)
  function currentSlug() {
    var path = location.pathname.replace(/\/+$/, '');
    var seg = path.split('/').pop() || 'index';
    return seg.replace(/\.html?$/i, '');
  }

  // referrer host only (drop query/path -> avoids logging anything identifying)
  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname : '(direct)';
    } catch (e) {
      return '(unknown)';
    }
  }

  function beacon(payload) {
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () { /* non-blocking */ });
    } catch (e) { /* never break the page */ }
  }

  var SLUG = currentSlug();

  // ---- 1. blog_view on load ----
  beacon({
    action: 'blog_view',
    slug: SLUG,
    referrer: referrerHost(),
    user_agent: (navigator.userAgent || '').slice(0, 200),
  });

  // ---- 2. blog_click on CTA links ----
  // Classify a href into a funnel target type.
  function classify(href) {
    if (!href) return null;
    var h = href.toLowerCase();
    if (h.indexOf('calendly') > -1) return 'calendly';
    if (h.indexOf('financial-checkup') > -1) return 'checkup';
    if (h.indexOf('/tools/') > -1 || /(^|\/)tool-[a-z]/.test(h)) return 'tool';
    if (h.indexOf('/consultation') > -1 || h.indexOf('consultation.html') > -1) return 'consultation';
    return null; // not a funnel CTA -> don't track
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var type = classify(a.getAttribute('href'));
    if (!type) return;
    beacon({
      action: 'blog_click',
      slug: SLUG,
      target_type: type,
      target: a.getAttribute('href').slice(0, 200),
    });
  }, true);
})();
