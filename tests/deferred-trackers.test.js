const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'js', 'deferred-trackers.js');
const source = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

test('defers trackers until interaction or post-load timeout without duplicates', () => {
  assert.ok(source, 'deferred tracker loader must exist');
  const appended = [];
  const listeners = {};
  const timers = [];
  const document = {
    readyState: 'loading',
    createElement(tag) { return { tagName: tag.toUpperCase(), async: false, src: '' }; },
    head: { append(element) { appended.push(element); } },
  };
  const window = {
    addEventListener(type, handler) { listeners[type] = handler; },
    removeEventListener() {},
    setTimeout(handler, delay) { timers.push({ handler, delay }); return timers.length; },
  };

  vm.runInNewContext(source, { window, document, setTimeout: window.setTimeout });
  assert.equal(appended.length, 0);
  assert.equal(typeof listeners.load, 'function');
  assert.equal(typeof listeners.pointerdown, 'function');

  listeners.load();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 3500);
  assert.equal(appended.length, 0);

  listeners.pointerdown();
  assert.deepEqual(appended.map((item) => item.src), [
    '/js/pixel.js',
    'https://www.clarity.ms/tag/wjulbbpfmx',
  ]);
  assert.ok(appended.every((item) => item.async));

  timers[0].handler();
  assert.equal(appended.length, 2, 'timeout must not load duplicate trackers');
});
