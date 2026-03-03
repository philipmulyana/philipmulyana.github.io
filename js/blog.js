let allItems = [];
let activeCategory = 'all';
let activeType = 'all';

async function loadBlog() {
    try {
        const [newsRes, postsRes] = await Promise.all([
            fetch('data/blog.json').catch(() => ({ ok: false })),
            fetch('data/posts.json').catch(() => ({ ok: false }))
        ]);

        if (newsRes.ok) {
            const newsData = await newsRes.json();
            const newsItems = (newsData.articles || []).map(a => ({ ...a, type: 'news' }));
            allItems.push(...newsItems);
        }

        if (postsRes.ok) {
            const postsData = await postsRes.json();
            const postItems = (postsData.posts || []).map(p => ({ ...p, type: 'original' }));
            allItems.push(...postItems);
        }

        // Sort: original posts first, then by date descending
        allItems.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'original' ? -1 : 1;
            return new Date(b.date) - new Date(a.date);
        });

        renderItems();
    } catch (err) {
        document.getElementById('blog-grid').innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <p class="text-lg font-medium">No articles yet</p>
                <p class="text-sm mt-2">Check back soon for new content.</p>
            </div>
        `;
    }
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
        return item.type === 'original' ? renderPostCard(item) : renderNewsCard(item);
    }).join('');
}

function renderPostCard(post) {
    const categoryColors = {
        insurance: 'bg-purple-100 text-purple-700',
        investment: 'bg-blue-100 text-blue-700',
        personal_finance: 'bg-green-100 text-green-700',
        economy: 'bg-orange-100 text-orange-700'
    };
    const badgeClass = categoryColors[post.category] || 'bg-gray-100 text-gray-700';
    const formattedDate = formatDate(post.date);

    return `
        <article class="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300 border-l-4 border-black">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-black text-white">Artikel</span>
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}">${post.categoryLabel}</span>
                <span class="text-xs text-gray-400">${formattedDate}</span>
            </div>
            <h3 class="font-bold text-lg leading-snug mb-3">${post.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed mb-4">${post.excerpt}</p>
            <div class="flex items-center justify-between">
                <a href="post-${post.slug}.html"
                    class="inline-flex items-center text-sm font-medium text-black hover:text-gray-600 transition-colors">
                    Baca selengkapnya
                    <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </a>
                <span class="text-xs text-gray-400">${post.readingTime}</span>
            </div>
        </article>
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
        <article class="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}">${article.categoryLabel}</span>
                <span class="text-xs text-gray-400">${formattedDate}</span>
                <span class="text-xs text-gray-300">|</span>
                <span class="text-xs text-gray-400">${article.source}</span>
            </div>
            <h3 class="font-bold text-lg leading-snug mb-3">${article.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed mb-4">${article.hook}</p>
            <details class="group mb-4">
                <summary class="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-black transition-colors">
                    Why it matters
                </summary>
                <p class="text-sm text-gray-500 mt-2 leading-relaxed">${article.whyMatters}</p>
            </details>
            ${article.takeaway ? `
            <div class="bg-white rounded-xl p-3 mb-4 border border-gray-200">
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Key Takeaway</p>
                <p class="text-sm text-gray-700">${article.takeaway}</p>
            </div>
            ` : ''}
            <a href="${article.url}" target="_blank" rel="noopener"
                class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors">
                Read full article
                <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
        </article>
    `;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', loadBlog);
