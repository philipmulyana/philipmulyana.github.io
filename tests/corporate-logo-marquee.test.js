const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const scriptPath = path.join(root, 'js', 'corporate.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const html = fs.readFileSync(path.join(root, 'corporate', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site', 'corporate.css'), 'utf8');

function createHarness({ reducedMotion = false } = {}) {
  const duplicateItems = [{ removed: false }, { removed: false }];
  duplicateItems.forEach((item) => {
    item.removeAttribute = (name) => {
      if (name === 'data-brand') item.removed = true;
    };
  });
  const duplicateImages = [{ alt: 'AIA' }, { alt: 'Allianz' }];
  const duplicate = {
    attributes: { 'aria-label': 'Daftar brand' },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelectorAll(selector) {
      if (selector === '[data-brand]') return duplicateItems;
      if (selector === 'img') return duplicateImages;
      return [];
    },
  };
  const sourceImages = [{ complete: true, loading: 'lazy' }, { complete: true, loading: 'lazy' }];
  const group = {
    querySelectorAll(selector) { return selector === 'img' ? sourceImages : []; },
    cloneNode(deep) {
      assert.equal(deep, true);
      return duplicate;
    },
  };
  const appended = [];
  const classes = [];
  const track = {
    querySelector(selector) { return selector === '.corporate-partner-grid' ? group : null; },
    append(node) { appended.push(node); },
    classList: { add(name) { classes.push(name); } },
  };
  const carousel = {
    dataset: {},
    querySelector(selector) { return selector === '.corporate-partner-track' ? track : null; },
  };
  let observerOptions;
  let observerCallback;
  let disconnected = false;
  class IntersectionObserver {
    constructor(callback, options) {
      observerCallback = callback;
      observerOptions = options;
    }
    observe(target) { assert.equal(target, carousel); }
    disconnect() { disconnected = true; }
  }
  const document = {
    querySelector(selector) {
      if (selector === '#inquiry-form') return null;
      return null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, '[data-logo-marquee]');
      return [carousel];
    },
  };
  const window = {
    matchMedia() { return { matches: reducedMotion }; },
    IntersectionObserver,
    requestAnimationFrame(callback) { callback(); },
    location: { origin: 'https://philipmulyana.com' },
    crypto: { randomUUID: () => 'test-id' },
  };
  return {
    context: { window, document, IntersectionObserver, Promise, module: { exports: {} }, fetch: async () => {} },
    sourceImages,
    duplicateImages,
    duplicateItems,
    duplicate,
    appended,
    classes,
    getObserverCallback: () => observerCallback,
    getObserverOptions: () => observerOptions,
    wasDisconnected: () => disconnected,
  };
}

test('keeps the production three-row auto-carousel contract', () => {
  const group = html.match(/<ul class="corporate-partner-grid"[\s\S]*?<\/ul>/);
  assert.ok(group, 'semantic partner group must exist');
  assert.equal((group[0].match(/<li(?:\s|>)/g) || []).length, 31);
  assert.equal((html.match(/data-logo-marquee/g) || []).length, 1);
  assert.match(html, /corporate-logo-carousel[^>]+tabindex="0"/);
  assert.match(css, /\.corporate-partner-grid\{[^}]*grid-template-rows:repeat\(3,132px\)/);
  assert.match(css, /\.corporate-partner-track\.is-ready\{[^}]*animation:corporate-logo-marquee/);
  assert.match(css, /corporate-logo-carousel:hover \.corporate-partner-track/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important/);
});

test('starts the corporate logo loop near the viewport after logos load', async () => {
  const harness = createHarness();
  vm.runInNewContext(source, harness.context);

  assert.equal(harness.appended.length, 0, 'loop must not clone or load early');
  assert.equal(harness.getObserverOptions().rootMargin, '500px 0px');

  harness.getObserverCallback()([{ isIntersecting: true }]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(harness.wasDisconnected(), true);
  assert.ok(harness.sourceImages.every((image) => image.loading === 'eager'));
  assert.equal(harness.appended.length, 1);
  assert.equal(harness.appended[0], harness.duplicate);
  assert.equal(harness.duplicate.attributes['aria-hidden'], 'true');
  assert.equal('aria-label' in harness.duplicate.attributes, false);
  assert.ok(harness.duplicateItems.every((item) => item.removed));
  assert.ok(harness.duplicateImages.every((image) => image.alt === ''));
  assert.deepEqual(harness.classes, ['is-ready']);
});

test('does not animate or clone when reduced motion is requested', () => {
  const harness = createHarness({ reducedMotion: true });
  vm.runInNewContext(source, harness.context);
  assert.equal(harness.getObserverCallback(), undefined);
  assert.equal(harness.appended.length, 0);
});
