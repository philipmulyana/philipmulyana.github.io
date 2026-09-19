const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const blogSource = fs.readFileSync(path.join(root, 'js', 'blog.js'), 'utf8');

function jsonResponse(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    },
  };
}

async function renderBlog({ apiPayload, blogArticles = [], staticPosts, returnState = false }) {
  const list = { innerHTML: '', setAttribute() {} };
  const status = { textContent: '' };
  const loadMore = {
    hidden: true,
    addEventListener(type, callback) {
      if (type === 'click') this.click = callback;
    },
  };
  const fallbackPosts = staticPosts || [{
    slug: 'artikel-statis',
    title: 'Artikel statis tetap tampil',
    category: 'personal_finance',
    categoryLabel: 'Artikel Kami',
    date: '2026-09-16',
    excerpt: 'Fallback yang sudah dipublikasikan.',
    readingTime: '2 menit baca',
  }];

  const fetch = async (url) => {
    if (url === '/data/blog.json') return jsonResponse({ articles: blogArticles });
    if (url === '/data/posts.json') return jsonResponse({ posts: fallbackPosts });
    if (url.includes('modal.run')) return jsonResponse(apiPayload);
    throw new Error(`Unexpected URL: ${url}`);
  };

  const document = {
    addEventListener() {},
    getElementById(id) {
      if (id === 'blog-list') return list;
      if (id === 'blog-status') return status;
      if (id === 'blog-load-more') return loadMore;
      throw new Error(`Unexpected id: ${id}`);
    },
    querySelectorAll() {
      return [];
    },
  };

  const context = vm.createContext({ document, fetch, Date, Intl, URL, console });
  vm.runInContext(blogSource, context);
  await context.loadBlog();
  if (returnState) {
    loadMore.click ||= () => vm.runInContext('visibleCount += PAGE_SIZE; renderItems();', context);
    return { list, status, loadMore, context };
  }
  return list.innerHTML;
}

test('keeps static blog posts when the background API reports an error with no posts', async () => {
  const html = await renderBlog({
    apiPayload: { error: 'Airtable API error: 403', posts: [] },
  });

  assert.match(html, /Artikel statis tetap tampil/);
  assert.match(html, /Artikel Kami · Keuangan Pribadi/);
  assert.doesNotMatch(html, /Artikel Kami · Artikel Kami/);
  assert.doesNotMatch(html, /Tidak ada artikel di kategori ini/);
});

test('shows twelve articles first and reveals the remainder on request', async () => {
  const staticPosts = Array.from({ length: 13 }, (_, index) => ({
    slug: `artikel-${index + 1}`,
    title: `Artikel ${index + 1}`,
    category: 'personal_finance',
    categoryLabel: 'Artikel Kami',
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    excerpt: `Ringkasan ${index + 1}`,
    readingTime: '2 menit baca',
  }));

  const state = await renderBlog({
    apiPayload: { error: 'fallback only', posts: [] },
    staticPosts,
    returnState: true,
  });

  assert.equal((state.list.innerHTML.match(/class="row-link"/g) || []).length, 12);
  assert.equal(state.loadMore.hidden, false);
  assert.match(state.status.textContent, /12 dari 13 artikel/);

  state.loadMore.click();

  assert.equal((state.list.innerHTML.match(/class="row-link"/g) || []).length, 13);
  assert.equal(state.loadMore.hidden, true);
  assert.match(state.status.textContent, /13 dari 13 artikel/);
});

test('removes markdown markers from card excerpts without rendering HTML', async () => {
  const html = await renderBlog({
    apiPayload: { posts: [] },
    staticPosts: [
      {
        slug: 'plain-excerpt',
        title: 'Plain excerpt',
        excerpt: 'Aturan ini **wajib** dipahami sebelum memilih.',
        date: '2026-09-20',
        readingTime: 2,
        type: 'article',
        typeLabel: 'Artikel Kami',
        category: 'insurance',
        categoryLabel: 'Insurance'
      }
    ]
  });

  assert.match(html, /Aturan ini wajib dipahami sebelum memilih\./);
  assert.doesNotMatch(html, /\*\*/);
  assert.doesNotMatch(html, /<strong>/);
});

test('uses valid API posts while preserving blog.json news', async () => {
  const html = await renderBlog({
    apiPayload: {
      posts: [{
        slug: 'artikel-api',
        title: 'Artikel terbaru dari API',
        category: 'investment',
        categoryLabel: 'Artikel Kami',
        date: '2026-09-17',
      }],
    },
    blogArticles: [{
      slug: 'berita-statis',
      title: 'Berita dari blog.json',
      category: 'economy',
      categoryLabel: 'News Insight',
      date: '2026-09-15',
    }],
  });

  assert.match(html, /Artikel terbaru dari API/);
  assert.match(html, /Berita dari blog\.json/);
  assert.doesNotMatch(html, /Artikel statis tetap tampil/);
});

test('shared navigation uses root-relative links from nested pages', () => {
  const navbar = fs.readFileSync(path.join(root, 'partials', 'navbar.html'), 'utf8');

  assert.match(navbar, /href="\/blog\.html"/);
  assert.match(navbar, /href="\/consultation\.html"/);
  assert.doesNotMatch(navbar, /href="blog\.html"/);
  assert.doesNotMatch(navbar, /href="consultation\.html"/);
});

test('shared footer contains no placeholder links', () => {
  const footer = fs.readFileSync(path.join(root, 'partials', 'footer.html'), 'utf8');

  assert.doesNotMatch(footer, /href="#"/);
});
