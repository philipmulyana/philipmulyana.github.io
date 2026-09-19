const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site.js'), 'utf8');

function button(textContent) {
  const listeners = {};
  const attributes = {};
  return {
    textContent,
    listeners,
    attributes,
    addEventListener(type, handler) { listeners[type] = handler; },
    setAttribute(name, value) { attributes[name] = value; },
  };
}

test('site forwarding drops PII-shaped values and carousel previous wraps', () => {
  const link = { href: 'https://philipmulyana.com/links/#link-list' };
  const previous = button('←');
  const toggle = button('Jeda');
  const next = button('→');
  const status = { textContent: '' };
  const animation = {
    currentTime: 100,
    playState: 'running',
    effect: { getTiming: () => ({ duration: 64000 }) },
    pause() { this.playState = 'paused'; },
    play() { this.playState = 'running'; },
  };
  const track = {
    style: {},
    getAnimations: () => [animation],
  };
  const section = {
    querySelector(selector) {
      return {
        '[data-carousel-action="toggle"]': toggle,
        '[data-carousel-action="previous"]': previous,
        '[data-carousel-action="next"]': next,
        '[data-carousel-status]': status,
      }[selector] || null;
    },
  };
  const carousel = {
    dataset: {},
    closest: () => section,
    querySelector: (selector) => selector === '.partner-track' ? track : null,
  };
  let domReady;
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-years-since]') return [];
      if (selector === '[data-forward-attribution]') return [link];
      if (selector === '[data-carousel]') return [carousel];
      return [];
    },
    addEventListener(type, handler) {
      if (type === 'DOMContentLoaded') domReady = handler;
    },
  };
  const window = {
    location: {
      href: 'https://philipmulyana.com/corporate/?utm_source=meta&utm_campaign=user%40example.com&utm_content=081234567890&fbclid=IwAR0abc123xyz456def789',
      search: '?utm_source=meta&utm_campaign=user%40example.com&utm_content=081234567890&fbclid=IwAR0abc123xyz456def789',
    },
    matchMedia: () => ({ matches: false }),
  };

  vm.runInNewContext(source, {
    document, window, URL, URLSearchParams, Number, Math, Date, decodeURIComponent,
  });

  const params = new URL(link.href).searchParams;
  assert.equal(params.get('utm_source'), 'meta');
  assert.equal(params.get('fbclid'), 'IwAR0abc123xyz456def789');
  assert.equal(params.has('utm_campaign'), false);
  assert.equal(params.has('utm_content'), false);

  assert.equal(typeof domReady, 'function');
  domReady();
  previous.listeners.click();

  assert.equal(animation.currentTime, 60100);
  assert.equal(animation.playState, 'paused');
  assert.equal(toggle.attributes['aria-pressed'], 'true');
  assert.equal(status.textContent, 'Menampilkan brand sebelumnya.');
});
