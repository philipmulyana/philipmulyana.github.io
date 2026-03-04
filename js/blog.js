let allItems = [];
let activeCategory = 'all';
let activeType = 'all';

const MODAL_API = 'https://philip-mulyana--ai-website-builder-approved-posts.modal.run';

function assignType(post) {
    return post.categoryLabel === 'News Insight' ? 'news' : 'original';
}

async function loadBlog() {
    // 1. Load from static JSON first (instant)
    try {
        const [newsRes, postsRes] = await Promise.all([
            fetch('data/blog.json').catch(() => ({ ok: false })),
            fetch('data/posts.json').catch(() => ({ ok: false }))
        ]);

        if (newsRes.ok) {
            const newsData = await newsRes.json();
            const newsItems = (newsData.articles || []).map(a => ({ ...a, type: 'news', source: 'blog_json' }));
            allItems.push(...newsItems);
        }

        if (postsRes.ok) {
            const postsData = await postsRes.json();
            const postItems = (postsData.posts || []).map(p => ({ ...p, type: assignType(p), source: 'airtable' }));
            allItems.push(...postItems);
        }

        sortAndRender();
    } catch (err) {
        // Static files failed, will rely on Modal API below
    }

    // 2. Fetch from Modal API in background (always up-to-date)
    try {
        const res = await fetch(MODAL_API);
        if (res.ok) {
            const data = await res.json();
            const apiPosts = (data.posts || []).map(p => ({ ...p, type: assignType(p), source: 'airtable' }));

            // Merge: keep blog.json news, replace airtable posts with API data
            const blogJsonOnly = allItems.filter(i => i.source === 'blog_json');
            allItems = [...blogJsonOnly, ...apiPosts];
            sortAndRender();
        }
    } catch (err) {
        // Modal API unavailable, static data is already shown
    }
}

function sortAndRender() {
    allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderItems();
}

function filterType(type) {
    activeType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.remove('bg-gray-100', 'text-gray-600');
            btn.classList.add('bg-black', 'text-white');
        } else {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-600');
        }
    });
    renderItems();
}

function filterCategory(category) {
    activeCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.remove('bg-gray-100', 'text-gray-600');
            btn.classList.add('bg-black', 'text-white');
        } else {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-600');
        }
    });
    renderItems();
}

function renderItems() {
    let filtered = allItems;

    if (activeType === 'original') {
        filtered = filtered.filter(item => item.type === 'original');
    } else if (activeType === 'news') {
        filtered = filtered.filter(item => item.type === 'news');
    }

    if (activeCategory !== 'all') {
        filtered = filtered.filter(item => item.category === activeCategory);
    }

    const grid = document.getElementById('blog-grid');

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <p>Tidak ada artikel di kategori ini.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        // blog.json external news → renderNewsCard; Airtable articles → renderPostCard
        return item.source === 'blog_json' ? renderNewsCard(item) : renderPostCard(item);
    }).join('');
}

function renderPostCard(post) {
    const categoryColors = {
        insurance: 'bg-purple-100 text-purple-700',
        investment: 'bg-blue-100 text-blue-700',
        personal_finance: 'bg-green-100 text-green-700',
        economy: 'bg-orange-100 text-orange-700'
    };
    const categoryLabels = {
        insurance: 'Insurance',
        investment: 'Investment',
        personal_finance: 'Personal Finance',
        economy: 'Economy'
    };
    const badgeClass = categoryColors[post.category] || 'bg-gray-100 text-gray-700';
    const isNewsInsight = post.categoryLabel === 'News Insight';
    const typeBadge = isNewsInsight ? 'Berita Keuangan' : 'Artikel Kami';
    const topicLabel = categoryLabels[post.category] || post.categoryLabel;
    const formattedDate = formatDate(post.date);
    const postUrl = `post.html?slug=${post.slug}`;

    return `
        <a href="${postUrl}" class="block bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300 border-l-4 border-black cursor-pointer">
            <div class="badge-row">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-black text-white">${typeBadge}</span>
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}">${topicLabel}</span>
                <span class="text-xs text-gray-400">${formattedDate}</span>
            </div>
            <h3 class="font-bold text-lg leading-snug mb-3">${post.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed mb-4">${post.excerpt}</p>
            <div class="flex items-center justify-between">
                <span class="inline-flex items-center text-sm font-medium text-black">
                    Baca selengkapnya
                    <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </span>
                <span class="text-xs text-gray-400">${post.readingTime}</span>
            </div>
        </a>
    `;
}

function renderNewsCard(article) {
    const categoryColors = {
        insurance: 'bg-purple-100 text-purple-700',
        investment: 'bg-blue-100 text-blue-700',
        personal_finance: 'bg-green-100 text-green-700',
        economy: 'bg-orange-100 text-orange-700'
    };
    const badgeClass = categoryColors[article.category] || 'bg-gray-100 text-gray-700';
    const formattedDate = formatDate(article.date);

    return `
        <a href="${article.url}" target="_blank" rel="noopener" class="block bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300 cursor-pointer">
            <div class="badge-row">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}">${article.categoryLabel}</span>
                <span class="text-xs text-gray-400">${formattedDate}</span>
                <span class="text-xs text-gray-300">|</span>
                <span class="text-xs text-gray-400">${article.source}</span>
            </div>
            <h3 class="font-bold text-lg leading-snug mb-3">${article.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed mb-4">${article.hook}</p>
            <div class="flex items-center justify-between">
                <span class="inline-flex items-center text-sm font-medium text-gray-500">
                    Read full article
                    <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </span>
            </div>
        </a>
    `;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', loadBlog);
