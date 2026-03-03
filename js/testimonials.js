async function loadTestimonials(containerId, options = {}) {
    const { limit = 0, type = null } = options;

    try {
        const res = await fetch('data/testimonials.json');
        let testimonials = await res.json();

        // Filter by type if specified
        if (type) {
            testimonials = testimonials.filter(t => t.type === type);
        }

        // Sort by date descending
        testimonials.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Limit if specified
        if (limit > 0) {
            testimonials = testimonials.slice(0, limit);
        }

        renderTestimonials(containerId, testimonials);
    } catch (err) {
        // Silently fail — no testimonials is not critical
        console.log('Testimonials not loaded:', err.message);
    }
}

function renderTestimonials(containerId, testimonials) {
    const container = document.getElementById(containerId);
    if (!container || testimonials.length === 0) return;

    container.innerHTML = testimonials.map(t => {
        const typeBadge = t.type === 'speaking'
            ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Speaking</span>'
            : '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Consultation</span>';

        return `
            <div class="bg-gray-50 rounded-2xl p-6">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                        ${t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                        <p class="text-sm font-bold">${t.name}</p>
                        <p class="text-xs text-gray-400">${t.role}</p>
                    </div>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed mb-3">"${t.text}"</p>
                ${typeBadge}
            </div>
        `;
    }).join('');
}
