const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'js', 'corporate.js');
const source = fs.readFileSync(scriptPath, 'utf8');

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
    querySelectorAll(selector) {
      assert.equal(selector, '[data-logo-marquee]');
      return [carousel];
    },
  };
  const window = {
    matchMedia() { return { matches: reducedMotion }; },
    IntersectionObserver,
    requestAnimationFrame(callback) { callback(); },
  };
  return {
    context: { window, document, IntersectionObserver, Promise },
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
