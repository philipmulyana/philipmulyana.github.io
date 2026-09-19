const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sanitizer = fs.readFileSync(path.join(root, 'js', 'sanitize-attribution.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'speaking.html'), 'utf8');

function redirectScript() {
  const match = html.match(/<script data-speaking-redirect>([\s\S]*?)<\/script>/);
  assert.ok(match, 'speaking redirect script is present');
  return match[1];
}

function runRedirect(inputUrl, { runSanitizer = true } = {}) {
  let current = new URL(inputUrl);
  let destination = null;
  const location = {
    get href() { return current.href; },
    get pathname() { return current.pathname; },
    get search() { return current.search; },
    get hash() { return current.hash; },
    replace(value) { destination = new URL(value, current.origin).href; },
  };
  const history = {
    state: null,
    replaceState(_state, _title, value) { current = new URL(value, current.origin); },
  };
  const window = { location, history };
  const context = vm.createContext({ window, URL, URLSearchParams });
  if (runSanitizer) vm.runInContext(sanitizer, context);
  vm.runInContext(redirectScript(), context);
  return destination;
}

test('legacy speaking redirect preserves only canonical safe attribution', () => {
  const destination = runRedirect('https://philipmulyana.com/speaking.html?utm_source=meta&utm_medium=paid_social&utm_campaign=cmp_a1b2c3d4e5f6a7b8&utm_content=user%40example.com&phone=081234567890#topics');
  assert.equal(destination, 'https://philipmulyana.com/corporate/?utm_source=meta&utm_medium=paid_social&utm_campaign=cmp_a1b2c3d4e5f6a7b8#topics');
});

test('legacy speaking redirect drops malformed and PII attribution', () => {
  const destination = runRedirect('https://philipmulyana.com/speaking.html?utm_campaign=philipmulyana1988&fbclid=14155552671&email=user%40example.com');
  assert.equal(destination, 'https://philipmulyana.com/corporate/');
});

test('legacy speaking redirect fails closed when the sanitizer does not complete', () => {
  const destination = runRedirect('https://philipmulyana.com/speaking.html?utm_source=meta&utm_campaign=cmp_a1b2c3d4e5f6a7b8&email=user%40example.com#topics', { runSanitizer: false });
  assert.equal(destination, 'https://philipmulyana.com/corporate/');
});

test('sanitizer loads before the redirect and no tracker loads on the stub', () => {
  const sanitizerIndex = html.indexOf('/js/sanitize-attribution.js');
  const redirectIndex = html.indexOf('data-speaking-redirect');
  assert.notEqual(sanitizerIndex, -1);
  assert.notEqual(redirectIndex, -1);
  assert.ok(sanitizerIndex < redirectIndex);
  assert.doesNotMatch(html, /pixel\.js|clarity\.ms|fbevents\.js/);
  assert.match(html, /<noscript><meta http-equiv="refresh" content="0; url=\/corporate\/"><\/noscript>/);
});
