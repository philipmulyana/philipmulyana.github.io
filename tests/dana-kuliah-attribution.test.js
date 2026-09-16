const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'product', 'dana-kuliah', 'script.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const checkout = 'https://philip-mulyana-84218.myr.id/pl/dana-kuliah';

class FakeLink {
  constructor(href) {
    this.href = href;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    for (const listener of this.listeners.get('click') || []) listener();
  }
}

function runPage({ search = '', hrefs = [checkout] } = {}) {
  const links = hrefs.map((href) => new FakeLink(href));
  const fbqCalls = [];
  const window = {
    location: { search },
    fbq: (...args) => fbqCalls.push(args),
  };
  const document = {
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, '.purchase-cta');
      return links;
    },
  };

  vm.runInNewContext(source, { document, window, URL, URLSearchParams });
  return { links, fbqCalls };
}

test('copies every allowed attribution parameter to the Mayar checkout', () => {
  const allowed = {
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'dana_kuliah_moms',
    utm_content: 'video_a',
    utm_term: 'orang_tua_sd',
    placement: 'instagram_story',
    fbclid: 'QA-fbclid-123',
  };
  const search = `?${new URLSearchParams(allowed)}`;
  const { links } = runPage({ search });
  const result = new URL(links[0].href);

  assert.deepEqual(Object.fromEntries(result.searchParams), allowed);
});

test('does not forward unknown parameters or PII', () => {
  const search = '?utm_source=meta&coupon=hidden&name=Philip&email=qa%40example.com&phone=08123&whatsapp=08123';
  const { links } = runPage({ search });
  const params = new URL(links[0].href).searchParams;

  assert.equal(params.get('utm_source'), 'meta');
  for (const excluded of ['coupon', 'name', 'email', 'phone', 'whatsapp']) {
    assert.equal(params.has(excluded), false, `${excluded} must not be forwarded`);
  }
});

test('retains existing checkout query parameters', () => {
  const existingCheckout = `${checkout}?ref=existing&lang=id`;
  const { links } = runPage({ search: '?utm_campaign=qa', hrefs: [existingCheckout] });
  const params = new URL(links[0].href).searchParams;

  assert.equal(params.get('ref'), 'existing');
  assert.equal(params.get('lang'), 'id');
  assert.equal(params.get('utm_campaign'), 'qa');
});

test('safely URL-encodes special characters', () => {
  const value = 'orang tua & kuliah/2026?';
  const search = `?utm_content=${encodeURIComponent(value)}`;
  const { links } = runPage({ search });

  assert.equal(new URL(links[0].href).searchParams.get('utm_content'), value);
  assert.match(links[0].href, /utm_content=orang\+tua\+%26\+kuliah%2F2026%3F/);
});

test('leaves the clean checkout URL unchanged when no allowed parameters exist', () => {
  for (const search of ['', '?name=QA&coupon=ignored']) {
    const { links } = runPage({ search });
    assert.equal(links[0].href, checkout);
  }
});

test('decorates every purchase CTA', () => {
  const hrefs = Array.from({ length: 4 }, () => checkout);
  const { links } = runPage({ search: '?utm_source=meta', hrefs });

  assert.equal(links.length, 4);
  for (const link of links) {
    assert.equal(new URL(link.href).searchParams.get('utm_source'), 'meta');
  }
});

test('keeps one InitiateCheckout event per click with the approved payload', () => {
  const { links, fbqCalls } = runPage();

  assert.equal(links[0].listeners.get('click').length, 1);
  links[0].click();
  assert.equal(fbqCalls.length, 1);
  assert.equal(fbqCalls[0][0], 'track');
  assert.equal(fbqCalls[0][1], 'InitiateCheckout');
  assert.deepEqual(
    JSON.parse(JSON.stringify(fbqCalls[0][2])),
    {
      content_name: 'Course Dana Kuliah',
      currency: 'IDR',
      value: 149000,
    }
  );
  assert.doesNotMatch(source, /['"](?:PageView|Purchase)['"]/);
});
