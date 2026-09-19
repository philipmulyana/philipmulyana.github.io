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
    utm_campaign: 'cmp_a1b2c3d4e5f6a7b8',
    utm_content: 'ad_1a2b3c4d5e6f7a8b',
    utm_term: 'kw_8b7a6f5e4d3c2b1a',
    placement: 'stories',
    fbclid: 'IwAR0abc123xyz456def789',
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
  const { links } = runPage({ search: '?utm_campaign=cmp_a1b2c3d4e5f6a7b8', hrefs: [existingCheckout] });
  const params = new URL(links[0].href).searchParams;

  assert.equal(params.get('ref'), 'existing');
  assert.equal(params.get('lang'), 'id');
  assert.equal(params.get('utm_campaign'), 'cmp_a1b2c3d4e5f6a7b8');
});

test('rejects free-text and obfuscated PII inside attribution values', () => {
  const value = 'orang tua & kuliah/2026?';
  const search = `?utm_content=${encodeURIComponent(value)}&utm_campaign=user_at_example.com&utm_term=1-212-555-0198&fbclid=14155552671`;
  const { links } = runPage({ search });
  const params = new URL(links[0].href).searchParams;

  for (const field of ['utm_content', 'utm_campaign', 'utm_term', 'fbclid']) {
    assert.equal(params.has(field), false, `${field} must not be forwarded`);
  }
});

test('canonicalizes encoded safe values before Mayar forwarding', () => {
  const { links } = runPage({ search: '?utm_source=%256deta&utm_campaign=%2563mp_a1b2c3d4e5f6a7b8' });
  const params = new URL(links[0].href).searchParams;

  assert.equal(params.get('utm_source'), 'meta');
  assert.equal(params.get('utm_campaign'), 'cmp_a1b2c3d4e5f6a7b8');
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

test('delegates InitiateCheckout to Mayar and does not fire it from the landing page', () => {
  const { links, fbqCalls } = runPage();

  assert.equal(links[0].listeners.has('click'), false);
  links[0].click();
  assert.equal(fbqCalls.length, 0);
  assert.doesNotMatch(source, /['"]InitiateCheckout['"]/);
  assert.doesNotMatch(source, /['"](?:PageView|Purchase)['"]/);
});
