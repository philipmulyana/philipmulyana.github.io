const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site.js'), 'utf8');

test('site forwarding drops PII-shaped values without carousel controls', () => {
  const link = { href: 'https://philipmulyana.com/links/#link-list' };
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-years-since]') return [];
      if (selector === '[data-forward-attribution]') return [link];
      return [];
    },
  };
  const window = {
    location: {
      href: 'https://philipmulyana.com/corporate/?utm_source=meta&utm_campaign=user%40example.com&utm_content=081234567890&fbclid=IwAR0abc123xyz456def789',
      search: '?utm_source=meta&utm_campaign=user%40example.com&utm_content=081234567890&fbclid=IwAR0abc123xyz456def789',
    },
  };

  vm.runInNewContext(source, {
    document, window, URL, URLSearchParams, Number, Math, Date, decodeURIComponent,
  });

  const params = new URL(link.href).searchParams;
  assert.equal(params.get('utm_source'), 'meta');
  assert.equal(params.get('fbclid'), 'IwAR0abc123xyz456def789');
  assert.equal(params.has('utm_campaign'), false);
  assert.equal(params.has('utm_content'), false);
  assert.equal(source.includes('data-carousel-action'), false);
});
