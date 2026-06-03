const TESTIMONIALS_API = 'https://philip-mulyana--ai-website-builder-testimonials.modal.run';

async function fetchTestimonials(type) {
    let testimonials = [];

    if (type === 'consultation') {
        try {
            const apiRes = await fetch(`${TESTIMONIALS_API}?type=consultation`);
            if (apiRes.ok) {
                const data = await apiRes.json();
                testimonials = (data.testimonials || []).map(t => ({
                    name: t.name,
                    text: t.quote || t.text || '',
                    rating: t.rating || 5,
                    type: t.type || 'consultation',
                    featured: !!t.featured,
                    insight: t.insight || '',
                }));
            }
        } catch (err) {
            console.log('Airtable testimonials fetch failed, falling back to static:', err.message);
        }
    }

    if (testimonials.length === 0) {
        try {
            const res = await fetch('data/testimonials.json');
            const arr = await res.json();
            testimonials = (type ? arr.filter(t => t.type === type) : arr).map(t => ({
                name: t.name,
                text: t.text || t.quote || '',
                rating: t.rating || 5,
                type: t.type || type || 'consultation',
                featured: !!t.featured,
                insight: t.insight || '',
                date: t.date,
            }));
        } catch (err) {
            console.log('Static testimonials not loaded:', err.message);
        }
    }

    return testimonials;
}

async function loadTestimonials(containerId, options = {}) {
    const { limit = 0, type = null, layout = 'grid' } = options;
    let testimonials = await fetchTestimonials(type);
    if (!testimonials || testimonials.length === 0) return;

    testimonials.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date) - new Date(a.date);
        return (b.rating || 0) - (a.rating || 0);
    });

    if (limit > 0) testimonials = testimonials.slice(0, limit);

    if (layout === 'scroll') {
        renderScrollTestimonials(containerId, testimonials);
    } else {
        renderTestimonials(containerId, testimonials);
    }
}

// Load Summary + Featured-5 combo (used on consultation page)
async function loadTestimonialsSummary(summaryContainerId, featuredContainerId, options = {}) {
    const { type = 'consultation' } = options;
    const testimonials = await fetchTestimonials(type);
    if (!testimonials || testimonials.length === 0) {
        // Hide containers if no data
        const sc = document.getElementById(summaryContainerId);
        const fc = document.getElementById(featuredContainerId);
        if (sc) sc.closest('section')?.classList.add('hidden');
        if (fc) fc.closest('section')?.classList.add('hidden');
        return;
    }

    renderSummary(summaryContainerId, testimonials, featuredContainerId);

    // Featured 5: prefer manual flag, fallback to top 5 by rating + insight presence
    let featured = testimonials.filter(t => t.featured);
    if (featured.length === 0) {
        featured = [...testimonials].sort((a, b) => {
            const rDiff = (b.rating || 0) - (a.rating || 0);
            if (rDiff !== 0) return rDiff;
            // tiebreak: prefer ones with insight, then longer quote
            const iDiff = (b.insight ? 1 : 0) - (a.insight ? 1 : 0);
            if (iDiff !== 0) return iDiff;
            return (b.text || '').length - (a.text || '').length;
        }).slice(0, 5);
    } else {
        featured = featured.slice(0, 5);
    }

    renderScrollTestimonials(featuredContainerId, featured);
}

function renderSummary(containerId, testimonials, featuredContainerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = testimonials.length;
    const sum = testimonials.reduce((acc, t) => acc + (t.rating || 0), 0);
    const avg = total > 0 ? (sum / total) : 0;
    const satisfied = testimonials.filter(t => (t.rating || 0) >= 4).length;
    const satisfiedPct = total > 0 ? Math.round((satisfied / total) * 100) : 0;
    const withQuote = testimonials.filter(t => (t.text || '').trim().length > 0).length;

    // Bucket by rating
    const buckets = { 5: [], 4: [], 3: [], 2: [], 1: [] };
    testimonials.forEach(t => {
        const r = Math.max(1, Math.min(5, Math.round(t.rating || 0)));
        buckets[r].push(t);
    });
    const maxCount = Math.max(...[5,4,3,2,1].map(r => buckets[r].length), 1);

    const avgStr = avg.toFixed(1);
    const fullStars = Math.floor(avg);
    const hasHalf = (avg - fullStars) >= 0.25 && (avg - fullStars) < 0.75;
    const totalStars = hasHalf ? fullStars + 1 : Math.round(avg);

    const bigStarsHtml = Array.from({ length: 5 }, (_, i) =>
        `<svg class="w-5 h-5 ${i < Math.round(avg) ? 'text-yellow-400' : 'text-gray-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
    ).join('');

    const barsHtml = [5,4,3,2,1].map(r => {
        const count = buckets[r].length;
        const pct = total > 0 ? (count / maxCount) * 100 : 0;
        const disabled = count === 0;
        return `
            <button type="button" class="rating-bar w-full flex items-center gap-3 py-1.5 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}" data-rating="${r}" ${disabled ? 'disabled' : ''}>
                <span class="text-xs font-medium w-6 text-gray-600">${r} ★</span>
                <span class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span class="block h-full bg-yellow-400 rounded-full transition-all" style="width: ${pct}%"></span>
                </span>
                <span class="text-xs text-gray-500 w-8 text-right tabular-nums">${count}</span>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="bg-gray-50 rounded-3xl p-6 md:p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
                <!-- Left: Big avg + summary stats -->
                <div class="text-center md:text-left">
                    <div class="flex items-baseline justify-center md:justify-start gap-2">
                        <span class="text-5xl md:text-6xl font-black tracking-tight">${avgStr}</span>
                        <span class="text-2xl text-gray-400 font-medium">/ 5.0</span>
                    </div>
                    <div class="flex justify-center md:justify-start gap-0.5 mt-2">${bigStarsHtml}</div>
                    <p class="text-sm text-gray-600 mt-3"><span class="font-bold text-black">${satisfiedPct}%</span> klien puas</p>
                    <p class="text-xs text-gray-400 mt-1">${total} rating • ${withQuote} ulasan dengan cerita</p>
                </div>
                <!-- Right: Distribution bars -->
                <div class="space-y-0.5">
                    ${barsHtml}
                    <p class="text-xs text-gray-400 mt-3 text-center md:text-left">Klik bar untuk lihat ulasan</p>
                </div>
            </div>
            <!-- Expand area -->
            <div id="${containerId}-expand" class="hidden mt-6 pt-6 border-t border-gray-200"></div>
        </div>
    `;

    // Wire click handlers
    const expand = document.getElementById(`${containerId}-expand`);
    const featuredSection = featuredContainerId
        ? document.getElementById(featuredContainerId)?.closest('section')
        : null;
    let activeRating = null;

    function closeExpand() {
        activeRating = null;
        expand.classList.add('hidden');
        expand.innerHTML = '';
        if (featuredSection) featuredSection.classList.remove('hidden');
        // Reset active state on bars
        container.querySelectorAll('.rating-bar').forEach(b => b.classList.remove('ring-2', 'ring-yellow-400', 'rounded-lg'));
    }

    function openExpand(r) {
        activeRating = r;
        const list = buckets[r];
        if (list.length === 0) return;

        const cards = list.map(t => `
            <div class="snap-start shrink-0 w-[85%] md:w-[45%] lg:w-[32%] bg-white rounded-2xl p-5 border border-gray-100 flex flex-col">
                <div class="flex gap-0.5 mb-3">${renderStars(t.rating || 0)}</div>
                ${t.text ? `<p class="text-sm text-gray-600 leading-relaxed mb-4 flex-1">"${escapeHtml(t.text)}"</p>` : '<p class="text-xs text-gray-400 italic mb-4 flex-1">Tanpa cerita tertulis</p>'}
                <p class="text-sm font-bold">${escapeHtml(t.name || 'Anonymous')}</p>
            </div>
        `).join('');

        expand.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <p class="text-xs text-gray-500 uppercase tracking-wider">${list.length} ulasan ${r} bintang</p>
                <button type="button" class="expand-close text-gray-400 hover:text-black transition-colors p-1 -m-1" aria-label="Tutup">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-6 px-6 no-scrollbar">
                ${cards}
            </div>
        `;
        expand.classList.remove('hidden');

        // Highlight active bar
        container.querySelectorAll('.rating-bar').forEach(b => {
            if (parseInt(b.dataset.rating) === r) {
                b.classList.add('ring-2', 'ring-yellow-400', 'rounded-lg');
            } else {
                b.classList.remove('ring-2', 'ring-yellow-400', 'rounded-lg');
            }
        });

        // Hide Featured 5 section so expand doesn't push content down
        if (featuredSection) featuredSection.classList.add('hidden');

        // Wire close button
        expand.querySelector('.expand-close')?.addEventListener('click', closeExpand);
    }

    container.querySelectorAll('.rating-bar').forEach(btn => {
        btn.addEventListener('click', () => {
            const r = parseInt(btn.dataset.rating);
            if (activeRating === r) {
                closeExpand();
                return;
            }
            openExpand(r);
        });
    });
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) =>
        `<svg class="w-6 h-6 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
    ).join('');
}

function renderScrollTestimonials(containerId, testimonials) {
    const container = document.getElementById(containerId);
    if (!container || testimonials.length === 0) return;

    const cards = testimonials.map(t => `
        <div class="snap-start shrink-0 w-[85%] md:w-[45%] lg:w-[32%] bg-gray-50 rounded-2xl p-6 flex flex-col">
            <div class="flex gap-0.5 mb-3">${renderStars(t.rating || 5)}</div>
            <p class="text-sm text-gray-600 leading-relaxed mb-4 flex-1">"${t.text}"</p>
            <p class="text-sm font-bold">${t.name}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 no-scrollbar" id="${containerId}-track">
            ${cards}
        </div>
    `;

    // Auto-scroll
    const track = document.getElementById(`${containerId}-track`);
    if (!track || !track.firstElementChild) return;

    let timer = null;
    let idx = 0;
    const total = testimonials.length;

    function scrollNext() {
        idx = (idx + 1) % total;
        if (idx === 0) {
            // Loop back to start
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            // Scroll by one card width + gap
            const cardW = track.firstElementChild.offsetWidth + 16;
            track.scrollTo({ left: cardW * idx, behavior: 'smooth' });
        }
    }

    function start() {
        stop();
        timer = setInterval(scrollNext, 4000);
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    // Start after a short delay to ensure layout is ready
    setTimeout(start, 1000);

    // Pause on interaction
    track.addEventListener('touchstart', stop, { passive: true });
    track.addEventListener('touchend', () => setTimeout(start, 3000), { passive: true });
    track.addEventListener('mouseenter', stop);
    track.addEventListener('mouseleave', start);
}

function renderTestimonials(containerId, testimonials) {
    const container = document.getElementById(containerId);
    if (!container || testimonials.length === 0) return;

    container.innerHTML = testimonials.map(t => `
        <div class="bg-gray-50 rounded-2xl p-6">
            <div class="flex gap-0.5 mb-3">${renderStars(t.rating || 5)}</div>
            <p class="text-sm text-gray-600 leading-relaxed mb-3">"${t.text}"</p>
            <p class="text-sm font-bold">${t.name}</p>
        </div>
    `).join('');
}
