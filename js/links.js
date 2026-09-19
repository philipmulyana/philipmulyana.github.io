function latestBlogTimestamp(post) {
  return Date.parse(`${post.date}T00:00:00Z`);
}

function isValidPublicationDate(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isSafePublishedPost(post) {
  const title = typeof post?.title === 'string' ? post.title.trim() : '';
  const readingTimeIsSafe = post?.readingTime == null || (
    typeof post.readingTime === 'string'
    && post.readingTime.trim().length <= 40
  );
  return Boolean(
    post
    && title
    && title.length <= 160
    && typeof post.slug === 'string'
    && /^[a-z0-9-]+$/.test(post.slug)
    && isValidPublicationDate(post.date)
    && readingTimeIsSafe
  );
}

async function updateLatestBlog() {
  const link = document.querySelector('[data-latest-blog]');
  const title = document.querySelector('[data-latest-blog-title]');
  const meta = document.querySelector('[data-latest-blog-meta]');
  if (!link || !title || !meta) return;

  try {
    const response = await fetch('/data/posts.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts.filter(isSafePublishedPost) : [];
    const latest = posts.sort((a, b) => latestBlogTimestamp(b) - latestBlogTimestamp(a))[0];
    if (!latest) return;

    link.href = `/blog/${latest.slug}.html`;
    title.textContent = latest.title.trim();
    const readingTime = typeof latest.readingTime === 'string' ? latest.readingTime.trim() : '';
    meta.textContent = readingTime ? `Artikel Terbaru · ${readingTime}` : 'Artikel Terbaru';
  } catch {
    // Keep the static /blog.html fallback when the local feed is unavailable.
  }
}

document.addEventListener('DOMContentLoaded', updateLatestBlog);
