let allItems = [];
let activeCategory = 'all';
let activeType = 'all';
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;

const MODAL_API = 'https://philip-mulyana--ai-website-builder-approved-posts.modal.run';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safePostUrl(slug = '') {
  const safeSlug = String(slug).match(/^[a-z0-9-]+$/)?.[0];
  return safeSlug ? `/blog/${safeSlug}.html` : '/blog.html';
}

function safeExternalUrl(value = '') {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : '/blog.html';
  } catch {
    return '/blog.html';
  }
}

function assignType(post) {
  return post.categoryLabel === 'News Insight' ? 'news' : 'original';
}

async function loadBlog() {
  allItems = [];
  const list = document.getElementById('blog-list');
  if (list) list.setAttribute('aria-busy', 'true');

  try {
    const [newsRes, postsRes] = await Promise.all([
      fetch('/data/blog.json').catch(() => ({ ok: false })),
      fetch('/data/posts.json').catch(() => ({ ok: false })),
    ]);

    if (newsRes.ok) {
      const newsData = await newsRes.json();
      const newsItems = Array.isArray(newsData.articles)
        ? newsData.articles.map((article) => ({ ...article, type: 'news', source: 'blog_json' }))
        : [];
      allItems.push(...newsItems);
    }

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const postItems = Array.isArray(postsData.posts)
        ? postsData.posts.map((post) => ({ ...post, type: assignType(post), source: 'airtable' }))
        : [];
      allItems.push(...postItems);
    }

    sortAndRender();
  } catch {
    sortAndRender();
  }

  try {
    const res = await fetch(MODAL_API);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        const apiPosts = data.posts.map((post) => ({ ...post, type: assignType(post), source: 'airtable' }));
        const blogJsonOnly = allItems.filter((item) => item.source === 'blog_json');
        allItems = [...blogJsonOnly, ...apiPosts];
        sortAndRender();
      }
    }
  } catch {
    // Static approved posts stay visible.
  }
}

function sortAndRender() {
  allItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  renderItems();
}

function updatePressedState(selector, key, value) {
  document.querySelectorAll(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[key] === value));
  });
}

function filterType(type) {
  activeType = type;
  visibleCount = PAGE_SIZE;
  updatePressedState('.type-btn', 'type', type);
  renderItems();
}

function filterCategory(category) {
  activeCategory = category;
  visibleCount = PAGE_SIZE;
  updatePressedState('.filter-btn', 'category', category);
  renderItems();
}

function filteredItems() {
  return allItems.filter((item) => {
    const typeMatches = activeType === 'all' || item.type === activeType;
    const categoryMatches = activeCategory === 'all' || item.category === activeCategory;
    return typeMatches && categoryMatches;
  });
}

function renderItems() {
  const list = document.getElementById('blog-list');
  const status = document.getElementById('blog-status');
  const loadMore = document.getElementById('blog-load-more');
  if (!list) return;

  const items = filteredItems();
  list.setAttribute('aria-busy', 'false');

  if (items.length === 0) {
    list.innerHTML = '<div class="row-item"><div><h3>Tidak ada artikel di kategori ini.</h3></div></div>';
    if (status) status.textContent = '';
    if (loadMore) loadMore.hidden = true;
    return;
  }

  const visibleItems = items.slice(0, visibleCount);
  list.innerHTML = visibleItems.map((item) => (
    item.source === 'blog_json' ? renderNewsRow(item) : renderPostRow(item)
  )).join('');

  if (status) status.textContent = `Menampilkan ${visibleItems.length} dari ${items.length} artikel`;
  if (loadMore) loadMore.hidden = visibleItems.length >= items.length;
}

function renderPostRow(post) {
  const formattedDate = formatDate(post.date);
  const typeBadge = post.categoryLabel === 'News Insight' ? 'Berita Keuangan' : 'Artikel Kami';
  const categoryLabels = {
    insurance: 'Asuransi',
    investment: 'Investasi',
    personal_finance: 'Keuangan Pribadi',
    economy: 'Ekonomi',
  };
  const topicLabel = categoryLabels[post.category] || post.categoryLabel;
  const meta = [typeBadge, topicLabel, formattedDate, post.readingTime].filter(Boolean).map(escapeHtml).join(' · ');

  return `
    <a href="${safePostUrl(post.slug)}" class="row-link">
      <span class="meta">${meta}</span>
      <span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt)}</p><span class="text-link">Baca selengkapnya</span></span>
      <span class="row-arrow" aria-hidden="true">›</span>
    </a>`;
}

function renderNewsRow(article) {
  const formattedDate = formatDate(article.date);
  const meta = [article.categoryLabel, formattedDate, article.source].filter(Boolean).map(escapeHtml).join(' · ');

  return `
    <a href="${escapeHtml(safeExternalUrl(article.url))}" target="_blank" rel="noopener noreferrer" class="row-link">
      <span class="meta">${meta}</span>
      <span><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.hook)}</p><span class="text-link">Baca artikel lengkap</span></span>
      <span class="row-arrow" aria-hidden="true">↗</span>
    </a>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.type-btn').forEach((button) => {
    button.addEventListener('click', () => filterType(button.dataset.type));
  });
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => filterCategory(button.dataset.category));
  });
  document.getElementById('blog-load-more')?.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderItems();
  });
  loadBlog();
});
