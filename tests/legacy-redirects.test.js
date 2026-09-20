const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sanitizer = fs.readFileSync(path.join(root, 'js', 'sanitize-attribution.js'), 'utf8');

function redirectScript(relativePath) {
  const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const match = scripts.find((entry) => entry[1].includes('window.location.replace'));
  assert.ok(match, `${relativePath} redirect script is present`);
  return match[1];
}

function runRedirect(relativePath, inputUrl, { runSanitizer = true } = {}) {
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
  vm.runInContext(redirectScript(relativePath), context);
  return destination;
}

test('legacy tool redirect preserves safe attribution and removes PII', () => {
  const destination = runRedirect(
    'tool-retirement.html',
    'https://philipmulyana.com/tool-retirement.html?utm_source=meta&utm_medium=cpc&utm_campaign=cmp_a1b2c3d4e5f6a7b8&email=user%40example.com&phone=081234567890#faq',
  );
  assert.equal(
    destination,
    'https://philipmulyana.com/tools/retirement/?utm_source=meta&utm_medium=cpc&utm_campaign=cmp_a1b2c3d4e5f6a7b8#faq',
  );
});

test('legacy eduplan redirect lands on its equivalent working tool', () => {
  const destination = runRedirect(
    'tool-eduplan.html',
    'https://philipmulyana.com/tool-eduplan.html?utm_source=google&utm_medium=cpc&utm_campaign=cmp_fedcba9876543210&whatsapp=081298765432',
  );
  assert.equal(
    destination,
    'https://philipmulyana.com/tools/eduplan/?utm_source=google&utm_medium=cpc&utm_campaign=cmp_fedcba9876543210',
  );
});

test('legacy redirects fail closed when the sanitizer does not complete', () => {
  const destination = runRedirect(
    'tool-retirement.html',
    'https://philipmulyana.com/tool-retirement.html?utm_source=meta&email=secret%40example.com',
    { runSanitizer: false },
  );
  assert.equal(destination, 'https://philipmulyana.com/tools/retirement/');
});

function postRouterScript() {
  const html = fs.readFileSync(path.join(root, 'post.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  const script = scripts.find((source) => source.includes('async function loadPost'));
  assert.ok(script, 'post.html router script must exist');
  return script;
}

async function runPostRouter(search, posts = []) {
  let current = new URL(`https://philipmulyana.com/post.html${search}`);
  let redirectedTo = null;
  let readyCallback = null;
  const elements = new Map();
  const element = () => ({
    classList: { add() {}, remove() {} },
    textContent: '',
    innerHTML: '',
  });
  const location = {
    get href() { return current.href; },
    get pathname() { return current.pathname; },
    get search() { return current.search; },
    get hash() { return current.hash; },
    replace(value) { redirectedTo = new URL(value, current.origin).href; },
  };
  const history = {
    state: null,
    replaceState(_state, _title, value) { current = new URL(value, current.origin); },
  };
  const window = {
    location,
    history,
    __legacyPostSlug: current.searchParams.get('slug'),
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    console,
    fetch: async () => ({ ok: true, json: async () => ({ posts }) }),
    marked: { parse: (value) => value },
    window,
    document: {
      addEventListener(event, callback) {
        if (event === 'DOMContentLoaded') readyCallback = callback;
      },
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
    },
  });
  vm.runInContext(sanitizer, context);
  vm.runInContext(postRouterScript(), context);
  assert.equal(typeof readyCallback, 'function');
  await readyCallback();
  return { redirectedTo, currentUrl: current.href };
}

test('post router redirects only published canonical slugs with safe attribution', async () => {
  const result = await runPostRouter(
    '?slug=artikel-valid-2026&utm_source=meta&email=secret%40example.com',
    [{ slug: 'artikel-valid-2026' }],
  );
  assert.equal(
    result.redirectedTo,
    'https://philipmulyana.com/blog/artikel-valid-2026.html?utm_source=meta',
  );
  assert.equal(
    result.currentUrl,
    'https://philipmulyana.com/post.html?utm_source=meta',
  );
});

test('post router rejects PII and non-canonical slug values', async () => {
  const rejected = [
    '?slug=rahasia%40example.com',
    '?slug=081234567890',
    '?slug=folder%2Fartikel',
    '?slug=Artikel-Uppercase',
    '?slug=tidak-ada-di-index',
  ];
  for (const search of rejected) {
    const result = await runPostRouter(search);
    assert.equal(result.redirectedTo, null, search);
    assert.equal(result.currentUrl, 'https://philipmulyana.com/post.html', search);
  }
});
