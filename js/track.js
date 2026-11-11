/* track.js — first-party, cookieless traffic beacon for philipmulyana.com
   Stores one row per pageview / conversion click in Supabase (pm_events).
   No cookies, no personal data: path, referrer host, UTM tags, device type,
   and a random per-tab session id (sessionStorage, gone when the tab closes).
   Loaded by /js/pixel.js, so every page carrying the pixel is tracked. */
(function () {
  'use strict';
  if (window.__PM_TRACK__) return; window.__PM_TRACK__ = true;
  if (/^(localhost|127\.)/.test(location.hostname)) return;

  var URL_ = 'https://acahbbudqbqinsamyhsc.supabase.co/rest/v1/pm_events';
  var KEY = 'sb_publishable_Cy9zSQaPnD3rF3KTMSWWFA_prry7gda';

  function sid() {
    try {
      var s = sessionStorage.getItem('pm_sid');
      if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('pm_sid', s); }
      return s;
    } catch (e) { return 'nosession'; }
  }
  function refHost() {
    try {
      if (!document.referrer) return '(direct)';
      var h = new URL(document.referrer).hostname.replace(/^www\./, '');
      return h === location.hostname.replace(/^www\./, '') ? '(internal)' : h;
    } catch (e) { return '(unknown)'; }
  }
  var q = new URLSearchParams(location.search);
  var base = {
    path: location.pathname.replace(/index\.html$/, ''),
    ref_host: refHost(),
    utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'),
    fbclid: q.has('fbclid'),
    device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    session_id: sid()
  };
  function send(type, target) {
    var row = Object.assign({ type: type, target: target || null }, base);
    try {
      fetch(URL_, {
        method: 'POST', keepalive: true,
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).catch(function () {});
    } catch (e) {}
  }

  send('pageview');

  // Conversion clicks: WhatsApp, booking, webinar sign-up, Review Polis checkout, tools
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button');
    if (!a) return;
    var h = (a.getAttribute('href') || '') + ' ' + (a.textContent || '').slice(0, 40);
    var t = null;
    if (/wa\.me|whatsapp/i.test(h)) t = 'whatsapp';
    else if (/calendly|consultation|konsultasi/i.test(h)) t = 'booking';
    else if (/webinar/i.test(h)) t = 'webinar';
    else if (/mayar|review-polis/i.test(h)) t = 'review_polis';
    else if (/\/tools?\b|tool-|kalkulator|checkup|dana-kuliah/i.test(h)) t = 'tool';
    if (t) send('click', t);
  }, true);
})();
