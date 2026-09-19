const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'js', 'links.js');
const linksSource = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

function jsonResponse(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    },
  };
}

async function runUpdate({ payload, reject = false }) {
  const link = { href: '/blog.html' };
  const title = { textContent: 'Artikel Terbaru' };
  const meta = { textContent: 'Blog & Insights' };
  let domReadyHandler;
  const document = {
    addEventListener(event, handler) {
      if (event === 'DOMContentLoaded') domReadyHandler = handler;
    },
    querySelector(selector) {
      if (selector === '[data-latest-blog]') return link;
      if (selector === '[data-latest-blog-title]') return title;
      if (selector === '[data-latest-blog-meta]') return meta;
      return null;
    },
  };
  const fetch = async (url, options) => {
    assert.equal(url, '/data/posts.json');
    assert.equal(options?.cache, 'no-store');
    if (reject) throw new Error('offline');
    return jsonResponse(payload);
  };
  const context = vm.createContext({ document, fetch, Date, console });
  vm.runInContext(linksSource, context);
  assert.equal(typeof context.updateLatestBlog, 'function');
  assert.equal(typeof domReadyHandler, 'function');
  await context.updateLatestBlog();
  return { link, title, meta };
}

test('shows the newest published blog even when posts.json is not ordered', async () => {
  const result = await runUpdate({
    payload: {
      posts: [
        { slug: 'artikel-lama', title: 'Artikel Lama', date: '2026-08-01', readingTime: '2 menit baca' },
        { slug: 'artikel-terbaru', title: 'Artikel Terbaru Otomatis', date: '2026-09-18', readingTime: '5 menit baca' },
      ],
    },
  });

  assert.equal(result.link.href, '/blog/artikel-terbaru.html');
  assert.equal(result.title.textContent, 'Artikel Terbaru Otomatis');
  assert.equal(result.meta.textContent, 'Artikel Terbaru · 5 menit baca');
});

test('ignores a newer post when its slug is unsafe', async () => {
  const result = await runUpdate({
    payload: {
      posts: [
        { slug: 'javascript:alert-1', title: 'Tidak Aman', date: '2027-01-01' },
        { slug: 'artikel-aman', title: 'Artikel Aman', date: '2026-09-18' },
      ],
    },
  });

  assert.equal(result.link.href, '/blog/artikel-aman.html');
  assert.equal(result.title.textContent, 'Artikel Aman');
  assert.equal(result.meta.textContent, 'Artikel Terbaru');
});

test('keeps the safe blog fallback when latest-post loading fails', async () => {
  const result = await runUpdate({ payload: {}, reject: true });

  assert.equal(result.link.href, '/blog.html');
  assert.equal(result.title.textContent, 'Artikel Terbaru');
  assert.equal(result.meta.textContent, 'Blog & Insights');
});

test('ignores malformed and impossible publication dates', async () => {
  const result = await runUpdate({
    payload: {
      posts: [
        { slug: 'tanggal-rusak', title: 'Tanggal Rusak', date: 'not-a-date' },
        { slug: 'tanggal-mustahil', title: 'Tanggal Mustahil', date: '2027-02-30' },
        { slug: 'tanggal-valid', title: 'Tanggal Valid', date: '2026-09-18' },
      ],
    },
  });

  assert.equal(result.link.href, '/blog/tanggal-valid.html');
  assert.equal(result.title.textContent, 'Tanggal Valid');
});

test('keeps the fallback when every post has an invalid date', async () => {
  const result = await runUpdate({
    payload: { posts: [{ slug: 'tanpa-tanggal', title: 'Tanpa Tanggal', date: '' }] },
  });

  assert.equal(result.link.href, '/blog.html');
  assert.equal(result.title.textContent, 'Artikel Terbaru');
});

test('ignores unreasonable title and reading-time values', async () => {
  const result = await runUpdate({
    payload: {
      posts: [
        { slug: 'judul-terlalu-panjang', title: 'X'.repeat(161), date: '2027-01-03' },
        { slug: 'durasi-terlalu-panjang', title: 'Durasi Rusak', date: '2027-01-02', readingTime: '9'.repeat(41) },
        { slug: 'konten-wajar', title: 'Konten Wajar', date: '2027-01-01', readingTime: '6 menit baca' },
      ],
    },
  });

  assert.equal(result.link.href, '/blog/konten-wajar.html');
  assert.equal(result.title.textContent, 'Konten Wajar');
  assert.equal(result.meta.textContent, 'Artikel Terbaru · 6 menit baca');
});
