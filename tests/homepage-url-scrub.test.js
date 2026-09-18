const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'js', 'sanitize-attribution.js');
const source = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

test('scrubs PII and unknown fields from the address before trackers load', () => {
  let replacedUrl = null;
  const window = {
    location: {
      href: 'https://philipmulyana.com/?utm_source=meta&utm_campaign=family&fbclid=click-123&name=Philip&email=qa%40example.com&phone=08123&whatsapp=08123&coupon=SECRET&unknown=value#pilih',
    },
    history: {
      replaceState(_state, _title, url) {
        replacedUrl = url;
      },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams });

  assert.equal(
    replacedUrl,
    '/?utm_source=meta&utm_campaign=family&fbclid=click-123#pilih',
  );
  for (const excluded of ['name', 'email', 'phone', 'whatsapp', 'coupon', 'unknown']) {
    assert.equal(new URL(replacedUrl, 'https://philipmulyana.com').searchParams.has(excluded), false);
  }
});

test('drops unapproved fragments that could contain PII', () => {
  let replacedUrl = null;
  const window = {
    location: {
      href: 'https://philipmulyana.com/?utm_source=meta#email=qa@example.com&coupon=SECRET',
    },
    history: {
      replaceState(_state, _title, url) {
        replacedUrl = url;
      },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams });

  assert.equal(replacedUrl, '/?utm_source=meta');
});

test('drops malformed fragments without stopping the sanitizer', () => {
  let replacedUrl = null;
  const window = {
    location: { href: 'https://philipmulyana.com/?utm_source=meta#%E0%A4%A' },
    history: {
      replaceState(_state, _title, url) {
        replacedUrl = url;
      },
    },
  };

  assert.doesNotThrow(() => vm.runInNewContext(source, { window, URL, URLSearchParams }));
  assert.equal(replacedUrl, '/?utm_source=meta');
});

test('preserves approved service anchors while removing PII query fields', () => {
  for (const anchor of ['discovery-meeting', 'protection-review']) {
    let replacedUrl = null;
    const window = {
      location: { href: `https://philipmulyana.com/?email=qa@example.com#${anchor}` },
      history: {
        replaceState(_state, _title, url) {
          replacedUrl = url;
        },
      },
    };

    vm.runInNewContext(source, { window, URL, URLSearchParams });
    assert.equal(replacedUrl, `/#${anchor}`);
  }
});
