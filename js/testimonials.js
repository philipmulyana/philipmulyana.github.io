async function loadTestimonials(containerId, options = {}) {
    const { limit = 0, type = null, layout = 'grid' } = options;

    try {
        const res = await fetch('data/testimonials.json');
        let testimonials = await res.json();

        if (type) {
            testimonials = testimonials.filter(t => t.type === type);
        }

        testimonials.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (limit > 0) {
            testimonials = testimonials.slice(0, limit);
        }

        if (layout === 'scroll') {
            renderScrollTestimonials(containerId, testimonials);
        } else {
            renderTestimonials(containerId, testimonials);
        }
    } catch (err) {
        console.log('Testimonials not loaded:', err.message);
    }
}

function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) =>
        `<svg class="w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
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
