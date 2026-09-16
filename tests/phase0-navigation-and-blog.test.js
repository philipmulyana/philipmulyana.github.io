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

async function renderBlog({ apiPayload, blogArticles = [], staticPosts }) {
  const grid = { innerHTML: '' };
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
    if (url === 'data/blog.json') return jsonResponse({ articles: blogArticles });
    if (url === 'data/posts.json') return jsonResponse({ posts: fallbackPosts });
    if (url.includes('modal.run')) return jsonResponse(apiPayload);
    throw new Error(`Unexpected URL: ${url}`);
  };

  const document = {
    addEventListener() {},
    getElementById(id) {
      assert.equal(id, 'blog-grid');
      return grid;
    },
    querySelectorAll() {
      return [];
    },
  };

  const context = vm.createContext({ document, fetch, Date, Intl, console });
  vm.runInContext(blogSource, context);
  await context.loadBlog();
  return grid.innerHTML;
}

test('keeps static blog posts when the background API reports an error with no posts', async () => {
  const html = await renderBlog({
    apiPayload: { error: 'Airtable API error: 403', posts: [] },
  });

  assert.match(html, /Artikel statis tetap tampil/);
  assert.doesNotMatch(html, /Tidak ada artikel di kategori ini/);
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
