const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'js', 'homepage.js');
const source = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

class FixedDate {
  getFullYear() {
    return 2026;
  }
}

test('updates every experience value from its confirmed start year', () => {
  const elements = [2008, 2014, 2008, 2014].map((year) => ({
    dataset: { yearsSince: String(year) },
    textContent: 'fallback',
  }));
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-years-since]') return elements;
      if (selector === '[data-forward-attribution]') return [];
      throw new Error(`Unexpected selector: ${selector}`);
    },
  };

  const window = { location: { href: 'https://philipmulyana.com/', search: '' } };
  vm.runInNewContext(source, { document, window, Date: FixedDate, Number, Math, URL, URLSearchParams });

  assert.deepEqual(elements.map((element) => element.textContent), ['18', '12', '18', '12']);
});

test('forwards only approved attribution fields to internal funnel links', () => {
  const links = [
    { href: 'https://philipmulyana.com/product/dana-kuliah/' },
    { href: 'https://philipmulyana.com/consultation.html' },
  ];
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-years-since]') return [];
      if (selector === '[data-forward-attribution]') return links;
      throw new Error(`Unexpected selector: ${selector}`);
    },
  };
  const window = {
    location: {
      href: 'https://philipmulyana.com/?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8&placement=feed&fbclid=IwAR0abc123xyz456def789&name=Philip&email=qa%40example.com&phone=08123&whatsapp=08123&coupon=SECRET',
      search: '?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8&placement=feed&fbclid=IwAR0abc123xyz456def789&name=Philip&email=qa%40example.com&phone=08123&whatsapp=08123&coupon=SECRET',
    },
  };

  vm.runInNewContext(source, { document, window, Date: FixedDate, Number, Math, URL, URLSearchParams });

  for (const link of links) {
    const params = new URL(link.href).searchParams;
    assert.equal(params.get('utm_source'), 'meta');
    assert.equal(params.get('utm_campaign'), 'cmp_a1b2c3d4e5f6a7b8');
    assert.equal(params.get('placement'), 'feed');
    assert.equal(params.get('fbclid'), 'IwAR0abc123xyz456def789');
    for (const excluded of ['name', 'email', 'phone', 'whatsapp', 'coupon']) {
      assert.equal(params.has(excluded), false, `${excluded} must not be forwarded`);
    }
  }
});
