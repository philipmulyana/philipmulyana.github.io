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
      href: 'https://philipmulyana.com/?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8&fbclid=IwAR0abc123xyz456def789&name=Philip&email=qa%40example.com&phone=08123&whatsapp=08123&coupon=SECRET&unknown=value#first-call',
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
    '/?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8&fbclid=IwAR0abc123xyz456def789#first-call',
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

test('drops PII embedded inside otherwise allowed attribution values', () => {
  let replacedUrl = null;
  const window = {
    location: {
      href: 'https://philipmulyana.com/corporate/?utm_source=meta&utm_medium=coupon%3DSECRET&utm_campaign=qa%40example.com&utm_content=081234567890&utm_term=mailto%3Aprivate%40example.com&placement=name%3DPhilip&fbclid=IwAR0abc123xyz456def789',
    },
    history: {
      state: null,
      replaceState(_state, _title, url) {
        replacedUrl = url;
      },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams, decodeURIComponent });

  assert.equal(replacedUrl, '/corporate/?utm_source=meta&fbclid=IwAR0abc123xyz456def789');
});

test('drops double-encoded email values', () => {
  let replacedUrl = null;
  const window = {
    location: { href: 'https://philipmulyana.com/?utm_source=user%2540example.com' },
    history: {
      state: null,
      replaceState(_state, _title, url) { replacedUrl = url; },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams, decodeURIComponent });
  assert.equal(replacedUrl, '/');
});

test('drops international phones, free-text PII, obfuscated emails, and deeply encoded values', () => {
  let replacedUrl = null;
  const window = {
    location: {
      href: 'https://philipmulyana.com/corporate/?utm_source=meta&utm_medium=%2B1%20212%20555%200198&utm_campaign=user%2525252540example.com&utm_content=user%28at%29example.com&utm_term=Jl.%20Sudirman%20No.%2010%20Jakarta&placement=14155552671',
    },
    history: {
      state: null,
      replaceState(_state, _title, url) { replacedUrl = url; },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams, decodeURIComponent });
  assert.equal(replacedUrl, '/corporate/?utm_source=meta');
});

test('drops compact phone and obfuscated-email tokens', () => {
  let replacedUrl = null;
  const window = {
    location: {
      href: 'https://philipmulyana.com/corporate/?utm_source=meta&utm_medium=user_at_example_com123&utm_campaign=philipmulyana1988&utm_content=phone14155552671abc&utm_term=jl_sudirman_no_10&placement=x14155552671abc&fbclid=x14155552671abc',
    },
    history: {
      state: null,
      replaceState(_state, _title, url) { replacedUrl = url; },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams, decodeURIComponent });
  assert.equal(replacedUrl, '/corporate/?utm_source=meta');
});

test('canonicalizes encoded safe attribution tokens before keeping them', () => {
  let replacedUrl = null;
  const window = {
    location: { href: 'https://philipmulyana.com/?utm_source=%256deta&utm_campaign=%2563mp_a1b2c3d4e5f6a7b8' },
    history: {
      state: null,
      replaceState(_state, _title, url) { replacedUrl = url; },
    },
  };

  vm.runInNewContext(source, { window, URL, URLSearchParams, decodeURIComponent });
  assert.equal(replacedUrl, '/?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8');
});

test('preserves approved public anchors while removing PII query fields', () => {
  for (const anchor of ['first-call', 'artikel-terbaru', 'course', 'tentang', 'policy-review', 'proof', 'process', 'faq', 'inquiry', 'collaboration']) {
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
